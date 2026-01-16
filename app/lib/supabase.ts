import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
