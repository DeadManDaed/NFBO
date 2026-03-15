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
    const timeoutId = setTimeout(() => controller.abort(), 4000); 

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
      console.warn(`Tentative profil ${i + 1}/${retries} : ${err.name === 'AbortError' ? 'Timeout' : 'Erreur'}`);
      
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
  const [loading, setLoading] = useState(true); 

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
        // Nettoyage si le profil est introuvable/inactif malgré une auth valide
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (err) {
      console.error("Erreur resolveProfile:", err);
      setUser(null);
    } finally {
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 🛡️ DISJONCTEUR : Force la fin du chargement après 7s
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Safety Timeout : Déblocage forcé de l'UI");
        setLoading(false);
      }
    }, 7000);

    // 1. Initialisation de la session au montage
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

    // 2. Écouteur de changements d'état (on a retiré le visibilitychange ici)
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
      // 🛡️ SÉCURITÉ : Nettoyage préventif pour éviter les conflits de session
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await loadUserProfile(data.user.id);
      if (!profile) throw new Error('Profil utilisateur introuvable ou inactif');

      setUser(profile);
      return profile;
    } catch (err) {
      // On s'assure que loading repasse à false pour que l'utilisateur puisse récliquer
      setLoading(false);
      throw new Error(err.message || 'Identifiants incorrects');
    } finally {
      // Normalement déjà géré, mais par précaution :
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setLoading(false);
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
