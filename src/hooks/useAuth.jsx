// src/hooks/useAuth.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasResolved = useRef(false); // Pour empêcher les doubles appels

  const resolveProfile = useCallback(async (supabaseUser) => {
    if (hasResolved.current) return;
    
    if (!supabaseUser) {
      setUser(null);
      setLoading(false);
      hasResolved.current = true;
      return;
    }

    try {
      // On réduit les retries et on durcit le timeout pour MTN
      const profile = await loadUserProfile(supabaseUser.id, 1); 
      if (profile) {
        setUser(profile);
      } else {
        await supabase.auth.signOut();
        setUser(null);
      }
    } finally {
      setLoading(false);
      hasResolved.current = true;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 🛡️ DISJONCTEUR IMPITOYABLE
    // On le définit AVANT tout le reste.
    const timer = setTimeout(() => {
      if (mounted && !hasResolved.current) {
        console.error("🔥 AUTH CRITICAL TIMEOUT: Libération forcée.");
        setLoading(false);
      }
    }, 8000); // 8 secondes max pour décider

    const initAuth = async () => {
      try {
        // getSession est parfois celui qui pend indéfiniment sur mobile
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
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) resolveProfile(session.user);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

  // ... (Garder login/logout comme avant)
