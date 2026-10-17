import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseUrl } from '../core/supabaseConfig';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

export const isSupabaseServerEnabled = (): boolean => {
  return Boolean(isSupabaseUrl(supabaseUrl) && supabaseKey);
};

let _supabaseAdmin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient | null => {
  if (!isSupabaseServerEnabled()) return null;
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
};

export interface RoleRequestRecord {
  id: string;
  uid: string;
  win_uid: string;
  display_name: string;
  email: string;
  phone: string;
  target_role: 'knight' | 'merchant' | 'partner';
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save or sync a role request in Supabase.
 */
export async function syncRoleRequestToSupabase(request: RoleRequestRecord): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  try {
    const { error } = await sb.from('role_requests').upsert({
      id: request.id,
      uid: request.uid,
      win_uid: request.win_uid,
      display_name: request.display_name,
      email: request.email,
      phone: request.phone,
      target_role: request.target_role,
      details: request.details,
      status: request.status,
      rejection_reason: request.rejection_reason || null,
      reviewed_by: request.reviewed_by || null,
      reviewed_at: request.reviewed_at || null,
      created_at: request.created_at,
      updated_at: request.updated_at,
    });
    if (error) {
      console.warn('[Supabase] Failed to sync role request:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncRoleRequest exception:', err?.message);
    return false;
  }
}

/**
 * Save or sync a user profile to Supabase.
 */
export async function syncUserToSupabase(user: Record<string, any>): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  try {
    const { error } = await sb.from('users').upsert({
      id: user.uid,
      uid: user.uid,
      win_uid: user.winUid || user.win_uid || '',
      email: user.email || '',
      display_name: user.displayName || user.fullName || '',
      phone: user.phone || '',
      role: user.role || 'citizen',
      enabled_roles: user.enabledRoles || ['citizen'],
      is_admin: user.isAdmin === true,
      admin_level: user.adminLevel || null,
      status: user.status || 'active',
      province: user.province || '',
      district: user.district || '',
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase] Failed to sync user:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] syncUser exception:', err?.message);
    return false;
  }
}
