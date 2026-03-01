// src/hooks/useAuth.jsx
// Gestion de l'authentification via JWT.
// Le token est stocké dans localStorage sous la clé 'nbfo_token'.
// L'objet user est reconstruit depuis /api/auth/me à chaque chargement.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'nbfo_token';
const API_BASE  = '/api';

// ─── Helpers fetch authentifié ────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Fetch avec Authorization header automatique.
// Utilisable partout dans l'app : import { authFetch } from '../hooks/useAuth'
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

  if (res.status === 401) {
    // Token expiré ou invalide → nettoyage silencieux
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth:expired'));
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

  // Charger l'utilisateur depuis /api/auth/me si un token existe
  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await authFetch(`${API_BASE}/auth/me`);
      setUser(userData);
    } catch (err) {
      // Token invalide ou expiré
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();

    // Écouter l'événement d'expiration émis par authFetch
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [loadUser]);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async ({ username, password }) => {
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
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (_) {
      // On déconnecte côté client même si le serveur répond mal
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  // ─── Valeurs exposées ────────────────────────────────────────────────────────
  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin:    user?.role === 'superadmin',
    isAdmin:         user?.role === 'admin' || user?.role === 'superadmin',
    magasinId:       user?.magasin_id ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}