import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// This "anon" key is safe to expose publicly — it only allows what our
// Row Level Security policies permit (see supabase/schema.sql).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
