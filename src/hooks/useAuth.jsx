// src/hooks/useAuth.jsx

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);

  // ─── L'AutoClean : Nettoyage chirurgical ────────────────────────
  const autoClean = () => {
    console.warn("AutoClean activé : Délai dépassé ou session corrompue.");
    localStorage.removeItem('supabase.auth.token'); // Nom par défaut du jeton Supabase
    setUser(null);
  };

  // ─── Chargement du Profil avec Timeout 3s ────────────────────────
  const loadUserProfile = async (userId) => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 3000)
    );

    try {
      const fetchProfile = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data, error } = await Promise.race([fetchProfile, timeout]);
      if (error || !data) return null;
      return data;
    } catch (err) {
      return null;
    }
  };

  // ─── Initialisation Silencieuse ────────────────────────────────
  useEffect(() => {
    const initialize = async () => {
      try {
        // Tentative de récupération de session avec limite de 3s
        const sessionPromise = supabase.auth.getSession();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));

        const { data: { session } } = await Promise.race([sessionPromise, timeout]);

        if (session?.user) {
          const profile = await loadUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            autoClean(); // Session présente mais profil injoignable
          }
        }
      } catch (err) {
        autoClean(); // Timeout ou erreur réseau
      } finally {
        setLoading(false);
      }
    };

    if (isInitialMount.current) {
      initialize();
      isInitialMount.current = false;
    }

    // Gestion des événements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await loadUserProfile(session.user.id);
        setUser(profile);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async ({ username, password }) => {
    setLoading(true);
    // On vide avant pour garantir un jeton frais
    await supabase.auth.signOut().catch(() => {});
    
    // Logique email/username...
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: username.includes('@') ? username : await getEmailFromUsername(username), 
      password 
    });

    if (error) {
      setLoading(false);
      throw error;
    }
    // Le onAuthStateChange prendra le relais pour le setUser
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Helper rapide pour le login
async function getEmailFromUsername(username) {
  const { data } = await supabase.from('users').select('email').eq('username', username).maybeSingle();
  if (!data?.email) throw new Error('Utilisateur introuvable');
  return data.email;
}
