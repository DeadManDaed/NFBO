//src/hooks/useAuth.js
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

// ─── Charger les données métier avec Timeout Agressif ──────────────────────────
async function loadUserProfile(authId, retries = 1) {
  for (let i = 0; i <= retries; i++) {
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
      console.warn(`Tentative profil ${i + 1} : ${err.name === 'AbortError' ? 'Timeout' : 'Erreur'}`);
      if (i < retries) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const hasResolved = useRef(false); // Empêche les doubles exécutions

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

    // 🛡️ DISJONCTEUR DE SÉCURITÉ ABSOLU (8s)
    const safetyTimeout = setTimeout(() => {
      if (mounted && !hasResolved.current) {
        console.error("🔥 AUTH CRITICAL TIMEOUT : Libération forcée de l'UI.");
        setLoading(false);
        hasResolved.current = true;
      }
    }, 8000);

    // ── L'INITIALISATION AVEC LA COURSE DE VITESSE (Promise.race) ──
    const initAuth = async () => {
      try {
        // Le chronomètre de 3 secondes
        const supabaseTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT_SUPABASE_GETSESSION')), 3000)
        );

        // La course : getSession VS supabaseTimeout
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          supabaseTimeout
        ]);

        if (mounted && !hasResolved.current) {
          if (session?.user) {
            await resolveProfile(session.user);
          } else {
            setLoading(false);
            hasResolved.current = true;
          }
        }
      } catch (e) {
        console.warn("⚠️ Coupure forcée à l'initialisation :", e.message);
        if (mounted) {
          // Si on perd la course (Timeout ou Token corrompu), on nettoie tout de suite
          await supabase.auth.signOut().catch(() => {}); 
          setUser(null);
          setLoading(false);
          hasResolved.current = true;
        }
      }
    };

    initAuth();

    // ── ÉCOUTEUR D'ÉVÉNEMENTS AUTH ──
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

      const safetyTimeout = setTimeout(() => {
        console.warn("⏰ Safety timeout dans onAuthStateChange – libération forcée");
        setLoading(false);
        hasResolved.current = true;
      }, 10000);

      try {
        await resolveProfile(session.user);
      } catch (err) {
        console.error("Erreur dans onAuthStateChange:", err);
      } finally {
        clearTimeout(safetyTimeout);
      }
    }
  }
);
  // ─── LOGIN ────────────────────────────────────────────────────────────────────
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
    hasResolved.current = false; // On lève le verrou pour le nouveau cycle

    try {
      // Nettoyage impitoyable de toute session fantôme avant de commencer
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

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────
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
