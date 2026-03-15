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

export function getToken() {
  return null;
}

// ─── Charger les données métier depuis public.users ───────────────────────────
async function loadUserProfile(authId, retries = 2) { // On réduit à 2 pour économiser la data
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 secondes max

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, magasin_id, prenom, nom, email, statut, matricule')
        .eq('auth_id', authId)
        .single()
        .abortSignal(controller.signal); // On passe le signal à Supabase

      clearTimeout(timeoutId);

      if (error || !data) return null;
      if (data.statut !== 'actif') return null;

      // Récupération du nom du magasin
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
      if (err.name === 'AbortError') console.warn("Tentative de profil chronométrée (timeout)");
      
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500)); // Pause courte avant retry
      }
    }
  }
  return null;
}


// ─── Provider mis à jour ──────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // On commence à true pour éviter que le Login ne clignote avant de savoir si on est connecté
  const [loading, setLoading] = useState(true); 

  // Dans ton AuthProvider
const resolveProfile = useCallback(async (supabaseUser) => {
  if (!supabaseUser) {
    setUser(null);
    setLoading(false);
    return;
  }
  
  // On se donne une chance de charger, mais on ne bloque pas l'utilisateur éternellement
  const profile = await loadUserProfile(supabaseUser.id);
  
  if (profile) {
    setUser(profile);
  } else {
    // Si on n'arrive pas à charger le profil (erreur ou timeout)
    // On déconnecte pour éviter de rester dans un état instable
    await supabase.auth.signOut();
    setUser(null);
  }
  setLoading(false); // QUOI QU'IL ARRIVE, on arrête le chargement ici
}, []);


  useEffect(() => {
    let mounted = true;

    // 🛡️ DISJONCTEUR DE SÉCURITÉ
    // Si après 7s le sablier tourne encore, on force la main.
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth check trop long : débrayage forcé.");
        setLoading(false);
      }
    }, 7000);

    // 1. Vérification immédiate au chargement (Mount)
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

    // 2. Gestion de la visibilité (Ta sécurité actuelle)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        supabase.auth.signOut();
        setUser(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 3. Écouteur de changements (On retire l'exclusion du INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth Event:", event);

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
  }, [resolveProfile]); // Retiré loading des dépendances pour éviter les boucles

  // ... (reste du code login/logout identique)


  

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message || 'Identifiants incorrects');
    }

    const profile = await loadUserProfile(data.user.id);
    if (!profile) {
      setLoading(false);
      throw new Error('Profil utilisateur introuvable ou inactif');
    }

    setUser(profile);
    setLoading(false);
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
