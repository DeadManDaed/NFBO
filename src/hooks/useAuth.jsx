// src/hooks/useAuth.jsx
// Authentification via Supabase Auth.
// Le token est géré automatiquement par le client Supabase.
// Les données métier (role, magasin_id, nom) viennent de public.users via auth_id.

import { createContext, useContext, useState, useEffect } from 'react';
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
  // Compatibilité avec le code existant qui appelle getToken()
  // Retourne null — le token est géré par Supabase
  return null;
}

// ─── Charger les données métier depuis public.users ───────────────────────────
async function loadUserProfile(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
    .eq('auth_id', authId)
    .single();

  if (error || !data) return null;
  if (data.statut !== 'actif') return null;
  return data;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    let mounted = true;

    // Supabase v2 recommande de tout gérer uniquement via l'écouteur.
    // Il va déclencher INITIAL_SESSION au démarrage, puis SIGNED_IN, SIGNED_OUT ou TOKEN_REFRESHED.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          try {
            // On charge le profil. Si le réseau mobile bloque au retour de veille,
            // loadUserProfile peut échouer, mais on garantit l'arrêt du chargement.
            const profile = await loadUserProfile(session.user.id);
            if (mounted) {
              setUser(profile);
              setLoading(false);
            }
          } catch (err) {
            if (mounted) {
              setLoading(false); // Empêche l'écran de chargement infini en cas de crash
            }
          }
        } else {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  

  const login = async ({ username, password }) => {
    // Supabase Auth exige un email — username peut être un email
    // Si username n'est pas un email, on cherche l'email correspondant
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