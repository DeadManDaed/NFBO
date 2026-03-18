// src/hooks/useAuth.jsx

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ─── Nettoyage des données locales de l'utilisateur ──────────────────────────
function clearLocalUserData() {
  // QueryClient React Query — vidé depuis App.jsx via l'événement auth:signout
  window.dispatchEvent(new Event('auth:signout'));

  // Clés localStorage liées à l'utilisateur (hors session Supabase)
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // On ne touche pas aux clés Supabase Auth (storageKey configuré)
    if (key && !key.startsWith('nfbo-secure-auth')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // sessionStorage complet
  sessionStorage.clear();
}

// ─── Helper fetch authentifié ─────────────────────────────────────────────────
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
  // Ne pas signOut automatiquement — peut être une requête race condition
  // au rechargement. Lancer l'événement seulement.
  window.dispatchEvent(new Event('auth:expired'));
  throw new Error('Session expirée');
}
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error(err.message || `Erreur HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Chargement du profil métier ──────────────────────────────────────────────
async function loadUserProfile(authId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
          continue;
        }
        return null;
      }
      if (!data || data.statut !== 'actif') return null;

      let magasin_nom = null;
      if (data.magasin_id) {
        const { data: mag } = await supabase
          .from('magasins')
          .select('nom')
          .eq('id', data.magasin_id)
          .maybeSingle();
        magasin_nom = mag?.nom || null;
      }

      return { ...data, magasin_nom };
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const resolving       = useRef(false);
  const initialLoadDone = useRef(false);

  const resolveProfile = useCallback(async (supabaseUser) => {
    if (resolving.current) return;
    resolving.current = true;

    try {
      if (!supabaseUser) {
        setUser(null);
        return;
      }
      const profile = await loadUserProfile(supabaseUser.id);
      if (profile) {
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      resolving.current = false;
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted && !initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }, import.meta.env.DEV ? 30000 : 15000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) await resolveProfile(session?.user ?? null);
      } catch {
        if (mounted) {
          setUser(null);
          if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            setLoading(false);
          }
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          clearLocalUserData();
          setUser(null);
          return;
        }

        if (event === 'TOKEN_REFRESHED') return;
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' && session?.user) {
          if (user) return;
          await resolveProfile(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [resolveProfile, user]);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async ({ username, password }) => {
    let email = username;

    if (!username.includes('@')) {
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .maybeSingle();
      if (!data?.email) throw new Error('Utilisateur introuvable');
      email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Identifiants incorrects');

    const profile = await loadUserProfile(data.user.id);
    if (!profile) throw new Error('Profil utilisateur introuvable ou inactif');

    setUser(profile);
    return profile;
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      clearLocalUserData();
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setUser(null);
      resolving.current = false;
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
