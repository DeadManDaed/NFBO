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
        // ⏱️ TON IDÉE EN ACTION : La course de vitesse (Promise.race)
        // Si Supabase ne répond pas en 3 secondes, cette promesse "explose" exprès.
        const supabaseTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT_SUPABASE_GETSESSION')), 3000)
        );

        // On lance getSession() et le chronomètre en même temps. Le premier qui finit gagne.
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
        console.warn("⚠️ Déconnexion forcée suite à un blocage ou une erreur :", e.message);
        if (mounted) {
          // Si Supabase plante ou si le jeton est corrompu, on fait le ménage sans attendre
          // On utilise catch() pour ne pas recréer un blocage si le signOut plante aussi
          await supabase.auth.signOut().catch(() => console.log("SignOut silencieux")); 
          setUser(null);
          setLoading(false);
          hasResolved.current = true;
        }
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
