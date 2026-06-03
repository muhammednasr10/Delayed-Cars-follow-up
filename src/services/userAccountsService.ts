import { supabase } from '../lib/supabase'
import type { UserAccountDetail } from '../Types/permissions'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getUserAccounts(): Promise<UserAccountDetail[]> {
  const { data, error } = await client().from('v_user_accounts_detail').select('*').order('email')
  if (error) throw new Error(error.message)
  return (data ?? []) as UserAccountDetail[]
}

export async function blockUser(userId: string, reason: string): Promise<void> {
  const { error } = await client().rpc('block_user', { p_user_id: userId, p_reason: reason })
  if (error) throw new Error(error.message)
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await client().rpc('unblock_user', { p_user_id: userId })
  if (error) throw new Error(error.message)
}

export async function linkUserToEmployee(
  userId: string,
  employeeId: string | null,
  systemRoleId: string | null,
  notes?: string
): Promise<void> {
  const { error } = await client().rpc('link_user_to_employee', {
    p_user_id: userId,
    p_employee_id: employeeId,
    p_system_role_id: systemRoleId,
    p_notes: notes ?? null
  })
  if (error) throw new Error(error.message)
}

export async function updateUserSystemRole(userId: string, systemRoleId: string): Promise<void> {
  const { error } = await client().rpc('update_user_system_role', {
    p_user_id: userId,
    p_system_role_id: systemRoleId
  })
  if (error) throw new Error(error.message)
}

export async function getUserOverrides(userId: string) {
  const { data, error } = await client()
    .from('user_permission_overrides')
    .select('*, system_permissions(*)')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data ?? []
}
