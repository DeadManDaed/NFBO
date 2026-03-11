// src/hooks/useAuth.jsx
// Authentification via Supabase Auth.
// Le token est géré automatiquement par le client Supabase.
// Les données métier (role, magasin_id, nom) viennent de public.users via auth_id.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    await supabase.auth.signOut();
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error('Session expirée');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `Erreur HTTP ${res.status}` }));
    throw new Error(err.message || `Erreur HTTP ${res.status}`);
  }

  return res.json();
}

export function getToken() {
  return null;
}

// ─── Charger les données métier depuis public.users ───────────────────────────
async function loadUserProfile(authId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
        .eq('auth_id', authId)
        .single();

      if (error || !data) return null;
      if (data.statut !== 'actif') return null;

      // Charger le nom du magasin séparément
      let magasin_nom = null;
      if (data.magasin_id) {
        const { data: mag } = await supabase
          .from('magasins')
          .select('nom')
          .eq('id', data.magasin_id)
          .single();
        magasin_nom = mag?.nom || null;
      }

      return { ...data, magasin_nom };

    } catch (err) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Résoudre un user Supabase → profil métier ──────────────────────────
  const resolveProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await loadUserProfile(supabaseUser.id);
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    // 1. Tenter de récupérer la session existante (IndexedDB / refresh token)
    const init = async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();

        // Pas de session — tenter un refresh silencieux
        if (!session?.user) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed?.session || null;
        }

        if (mounted && !resolved) {
          resolved = true;
          await resolveProfile(session?.user || null);
        }
      } catch {
        if (mounted && !resolved) {
          resolved = true;
          setUser(null);
          setLoading(false);
        }
      }
    };

    init();

    // 2. Écouter les changements ultérieurs (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth] event:', event, 'user:', session?.user?.id);
        if (!mounted) return;

        // INITIAL_SESSION est géré par init() — on l'ignore ici pour éviter le conflit
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token renouvelé silencieusement — pas besoin de recharger le profil
          return;
        }

        if (session?.user) {
          if (event === 'SIGNED_IN') {
            await new Promise(r => setTimeout(r, 500));
          }
          resolved = true;
          await resolveProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const login = async ({ username, password }) => {
    let email = username;

    if (!username.includes('@')) {
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();
      if (!data?.email) throw new Error('Utilisateur introuvable');
      email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message || 'Identifiants incorrects');

    const profile = await loadUserProfile(data.user.id);
    if (!profile) throw new Error('Profil utilisateur introuvable ou inactif');

    setUser(profile);
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
