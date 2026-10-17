import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseUrl, isPublicSupabaseKey } from '../core/supabaseConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return isSupabaseUrl(supabaseUrl) && isPublicSupabaseKey(supabaseAnonKey);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface SupabaseConfigStatus {
  configured: boolean;
  url: string;
  hasAnonKey: boolean;
  provider: 'supabase';
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  return {
    configured: isSupabaseConfigured(),
    url: isSupabaseUrl(supabaseUrl) ? new URL(supabaseUrl).origin : '',
    hasAnonKey: Boolean(supabaseAnonKey),
    provider: 'supabase',
  };
}
