import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ascoyvaxlicqusjlbegq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY295dmF4bGljcXVzamxiZWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjU1MjgsImV4cCI6MjA4MDE0MTUyOH0.c1MJX3mproGuU1OSPLuphkJu5UGyCD5M8bW3IKnauUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const checkSupabaseConnection = async () => {
  try {
    const start = Date.now();
    // Just pinging the health check or a public table
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== '42P01') throw error; // Ignore table missing error, connection is what matters
    return { ok: true, latency: Date.now() - start };
  } catch (e) {
    console.error("Supabase connection check failed:", e);
    return { ok: false, error: e };
  }
};