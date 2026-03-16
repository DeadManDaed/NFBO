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
  const [loading, setLoading] = useState(true);

  // Ce ref protège contre les appels concurrents à resolveProfile.
  // Un seul appel peut s'exécuter à la fois.
  const resolving = useRef(false);

  const resolveProfile = useCallback(async (supabaseUser) => {
    // Si une résolution est déjà en cours, on ignore cet appel.
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
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      resolving.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Timeout de sécurité — déblocage forcé si rien ne répond
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, import.meta.env.DEV ? 30000 : 15000);

    // Initialisation : tente de récupérer la session existante
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await resolveProfile(session?.user ?? null);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener auth — on ignore TOKEN_REFRESHED pour éviter le lock Supabase.
    // TOKEN_REFRESHED ne change pas le profil métier, seulement le token JWT.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        // TOKEN_REFRESHED : on met juste à jour le loading sans retoucher le profil.
        // Le token est géré automatiquement par le client Supabase.
        if (event === 'TOKEN_REFRESHED') {
          setLoading(false);
          return;
        }

        // SIGNED_IN depuis un autre onglet ou après expiration réelle
        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true);
          await resolveProfile(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

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

    setLoading(true);

    try {
      // Nettoyage préventif pour éviter les locks résiduels
      await supabase.auth.signOut().catch(() => {});
      resolving.current = false;

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await loadUserProfile(data.user.id);
      if (!profile) throw new Error('Profil utilisateur introuvable ou inactif');

      setUser(profile);
      return profile;
    } catch (err) {
      throw new Error(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setUser(null);
      setLoading(false);
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
