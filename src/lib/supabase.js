import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
   // multiTab: false,
    // 🔑 LA NOUVELLE SERRURE : On change la clé pour repartir de zéro, 
    // ignorant ainsi tout jeton corrompu stocké précédemment.
    storageKey: 'nfbo-secure-auth-v2',
  },
});
