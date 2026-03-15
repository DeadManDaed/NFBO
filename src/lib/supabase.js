// src/lib/supabase.js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,   // Laisse Supabase gérer le rafraîchissement
    persistSession: true,      // On réactive, mais on sécurise le UI (voir point 1)
    detectSessionInUrl: true,
    storageKey: 'nfbo-auth-token', // Nom personnalisé pour éviter les conflits
    storage: window.localStorage
  },
});
