// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import { idbStorage } from './idbStorage';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            idbStorage,
    autoRefreshToken:   false,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});