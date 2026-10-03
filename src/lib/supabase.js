import { createClient } from '@supabase/supabase-js'

// Optional shared database for the song library (Supabase). Configure with
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the anon key is public by design;
// row-level security in the database decides who may edit).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
