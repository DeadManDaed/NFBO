// src/hooks/useAuth.jsx
 

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

// ─── Charger les données métier avec Timeout Agressif ──────────────────────────
async function loadUserProfile(authId, retries = 2) {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s max par tentative

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
        .eq('auth_id', authId)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      console.warn(`Tentative profil ${i + 1}/${retries} échouée ou chronométrée.`);
      
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // On commence en mode chargement

  const resolveProfile = useCallback(async (supabaseUser) => {
    if (!supabaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await loadUserProfile(supabaseUser.id);
      if (profile) {
        setUser(profile);
      } else {
        // En cas d'échec de profil (timeout ou inactif), on nettoie la session
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (err) {
      console.error("Erreur critique resolveProfile:", err);
      setUser(null);
    } finally {
      setLoading(false); // Libère l'UI quoi qu'il arrive
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 🛡️ DISJONCTEUR : Évite le sablier infini si Supabase ne répond jamais
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Safety Timeout : Libération forcée de l'interface.");
        setLoading(false);
      }
    }, 7000); // 7 secondes de battement maximum

    // 1. Init Session au montage
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            await resolveProfile(session.user);
          } else {
            setLoading(false);
          }
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // 2. Ta sécurité : Déconnexion à la perte du focus
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        supabase.auth.signOut();
        setUser(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 3. Écouteur d'événements Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await resolveProfile(session.user);
        } else {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
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

    setLoading(true);
    try {
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
