import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://gsggtrwpoiegplbibuxg.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ2d0cndwb2llZ3BsYmlidXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjI0MjcsImV4cCI6MjEwODE5ODQyN30.c8qc4Y1yum_nnzVr-ydZ6kKUHqXhneeawr5BnEF2WLY';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('https://')
);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
