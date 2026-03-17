// src/hooks/useAuth.jsx

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

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
    await supabase.auth.signOut().catch(() => {});
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

  // loading ne vaut true QUE lors du chargement initial.
  // Après, les refreshs de token sont silencieux.
  const [loading, setLoading] = useState(true);

  // Mutex : empêche deux appels concurrents à loadUserProfile
  const resolving = useRef(false);

  // Flag : le chargement initial est-il terminé ?
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
  // Profil non chargé (erreur réseau transitoire ou compte inactif).
  // On ne déconnecte PAS Supabase — on garde la session intacte
  // pour que le prochain regain de focus puisse réessayer.
  setUser(null);
}
    } catch {
      setUser(null);
    } finally {
      resolving.current = false;
      // Ne remettre loading à false qu'une seule fois — au chargement initial.
      // Les refreshs ultérieurs sont silencieux et ne doivent pas affecter loading.
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }
  }, []);

    useEffect(() => {
    let mounted = true;

    // Safety timeout — déblocage forcé si initAuth ne répond pas
    const safetyTimeout = setTimeout(() => {
      if (mounted && !initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }, import.meta.env.DEV ? 30000 : 15000);

    // Chargement initial depuis la session stockée
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await resolveProfile(session?.user ?? null);
        }
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

    // Listener auth — silencieux après le premier chargement
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          return;
        }

        // TOKEN_REFRESHED : Supabase renouvelle le token silencieusement.
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // INITIAL_SESSION : déjà géré par initAuth()
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // SIGNED_IN depuis un autre onglet ou après une vraie déconnexion/reconnexion
        if (event === 'SIGNED_IN' && session?.user) {
          if (user) return;
          await resolveProfile(session.user);
        }
      }
    );

    // ─── GESTION DU REGAIN DE FOCUS ET RETOUR RÉSEAU ─────────────
    // Reprise avec un simple refresh silencieux
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.refreshSession().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnline = () => {
      supabase.auth.refreshSession().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    // ─────────────────────────────────────────────────────────────

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
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

    // Nettoyage préventif

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
