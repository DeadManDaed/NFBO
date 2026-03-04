// src/hooks/useAuth.jsx
// Gestion de l'authentification via JWT.
// Le token est stocké dans localStorage sous la clé 'nfbo_token'.
// L'objet user est reconstruit depuis /api/auth/me à chaque chargement.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nfbo_token';
const API_BASE  = '/api';

// ─── Flag module-level (accessible par authFetch) ─────────────────────────────
let _logoutHandler = null; // sera injecté par le Provider

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function authFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  res.status === 401 && !window.__nfbo_logging_in) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth:expired'));
    const err = await res.json().catch(() => ({ message: 'Session expirée' }));
    throw new Error(err.message || 'Session expirée');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error(err.message || `Erreur HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await authFetch(`${API_BASE}/auth/me`);
      setUser(userData);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    const onExpired = () => { if (!window.__nfbo_logging_in) setUser(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [loadUser]);

  const login = async ({ username, password }) => {
    window.__nfbo_logging_in = true;
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Identifiants incorrects');
      }

      const { token, user: userData } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      setUser(userData);
      return userData;
    } finally {
      // On garde le flag actif 4s après le login pour laisser
      // le Dashboard charger ses données sans risque de déconnexion
      setTimeout(() => { window.__nfbo_logging_in = false; }, 4000);
    }
  };

  const logout = async () => {
    try {
      await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (_) {}
    finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      isSuperAdmin:    user?.role === 'superadmin',
      isAdmin:         user?.role === 'admin' || user?.role === 'superadmin',
      magasinId:       user?.magasin_id ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}