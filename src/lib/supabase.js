import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuration optimisée pour mobile (Capacitor/WebView)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    // Réactivé : Permet de ne pas perdre la session au moindre changement de focus
    persistSession: true,
    
    // Réactivé : Supabase gérera le rafraîchissement du token en tâche de fond
    autoRefreshToken: true,
    
    // Désactivé : Utile surtout pour les flux OAuth/Email (pas nécessaire ici)
    detectSessionInUrl: false,
    
    // Optionnel : Un préfixe clair pour tes clés dans le localStorage
    storageKey: 'nfbo-session-v1',
  },
});
