import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const LOAD_PROFILE_TIMEOUT = 4000;
const SAFETY_TIMEOUT_PROD  = 15000;
const SAFETY_TIMEOUT_DEV   = 30000;
const SAFETY_TIMEOUT = import.meta.env.DEV ? SAFETY_TIMEOUT_DEV : SAFETY_TIMEOUT_PROD;

const AuthContext = createContext(null);

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

async function loadUserProfile(authId, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      // Timeout manuel sans AbortController
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), LOAD_PROFILE_TIMEOUT)
      );

      const profilePromise = supabase
        .from('users')
        .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
        .eq('auth_id', authId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error || !data) return null;
      if (data.statut !== 'actif') return null;

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
      console.warn(`Tentative profil ${i + 1} : ${err.message}`);
      if (i < retries) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasResolved = useRef(false);
  const refreshPromise = useRef(null);
  const lastRefresh = useRef(0);

  const refreshProfile = useCallback(async () => {
    // Anti-bouncing : au moins 2 secondes entre deux rafraîchissements
    const now = Date.now();
    if (now - lastRefresh.current < 2000) return;
    lastRefresh.current = now;

    if (refreshPromise.current) return refreshPromise.current;

    refreshPromise.current = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await loadUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erreur dans refreshProfile:", err);
      } finally {
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  const resolveProfile = useCallback(async (supabaseUser) => {
    if (hasResolved.current) return;

    if (!supabaseUser) {
      setUser(null);
      setLoading(false);
      hasResolved.current = true;
      return;
    }

    try {
      const profile = await loadUserProfile(supabaseUser.id);
      if (profile) {
        setUser(profile);
      } else {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
      }
    } catch (err) {
      console.error("Erreur critique resolveProfile:", err);
      setUser(null);
    } finally {
      setLoading(false);
      hasResolved.current = true;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted && !hasResolved.current) {
        console.warn(`🔥 Safety timeout (${SAFETY_TIMEOUT}ms) – libération forcée.`);
        setLoading(false);
        hasResolved.current = true;
      }
    }, SAFETY_TIMEOUT);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && !hasResolved.current) {
          if (session?.user) {
            await resolveProfile(session.user);
          } else {
            setLoading(false);
            hasResolved.current = true;
          }
        }
      } catch (e) {
        console.warn("⚠️ Erreur getSession:", e.message);
        if (mounted) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setLoading(false);
          hasResolved.current = true;
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          hasResolved.current = false;
          setLoading(true);
          try {
            await resolveProfile(session.user);
          } catch (err) {
            console.error("Erreur onAuthStateChange:", err);
          }
        }
      }
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🌐 Onglet visible');
        supabase.auth.refreshSession().catch(console.warn);
        refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnline = () => {
      console.log('📡 Connexion rétablie');
      supabase.auth.refreshSession().catch(console.warn);
      refreshProfile();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [resolveProfile, refreshProfile]);

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

    setLoading(true);
    hasResolved.current = false;

    try {
      await supabase.auth.signOut().catch(() => {});
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await loadUserProfile(data.user.id);
      if (!profile) throw new Error('Profil utilisateur introuvable ou inactif');

      setUser(profile);
      return profile;
    } catch (err) {
      setLoading(false);
      throw new Error(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
      hasResolved.current = true;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setUser(null);
      setLoading(false);
      hasResolved.current = true;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === 'superadmin',
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      magasinId: user?.magasin_id ?? null,
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