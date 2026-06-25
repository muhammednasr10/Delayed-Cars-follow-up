import { supabase } from '../lib/supabase'
import type { UserAccountDetail } from '../Types/permissions'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type CreateUserAccountInput = {
  email: string
  password: string
  fullName?: string
  systemRoleId?: string
  employeeId?: string | null
}

export type UpdateUserAccountInput = {
  fullName?: string
  systemRoleId?: string
  employeeId?: string | null
  isActive?: boolean
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
    .select('*, system_permissions(module_key, permission_key, permission_name_ar)')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function createUserAccountViaRpc(input: CreateUserAccountInput): Promise<{ userId: string; email: string }> {
  const email = input.email.trim().toLowerCase()
  const { data: userId, error } = await client().rpc('admin_create_user', {
    p_email: email,
    p_password: input.password,
    p_full_name: input.fullName?.trim() ?? null,
    p_system_role_id: input.systemRoleId ?? null,
    p_employee_id: input.employeeId ?? null
  })
  if (error) throw error
  if (!userId) throw new Error('Failed to create user')
  return { userId: userId as string, email }
}

async function createUserAccountViaEdge(input: CreateUserAccountInput): Promise<{ userId: string; email: string }> {
  const { data, error } = await client().functions.invoke('admin-users', {
    body: {
      action: 'create',
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName?.trim(),
      systemRoleId: input.systemRoleId,
      employeeId: input.employeeId ?? null
    }
  })
  if (error) throw error
  const payload = data as { userId?: string; email?: string; error?: string }
  if (payload?.error) throw new Error(payload.error)
  if (!payload?.userId) throw new Error('Failed to create user')
  return { userId: payload.userId, email: payload.email ?? input.email }
}

function isMissingRpc(err: { code?: string; message?: string }, fn: string): boolean {
  return err.code === '42883' || (err.message?.includes(fn) ?? false)
}

export async function createUserAccount(input: CreateUserAccountInput): Promise<{ userId: string; email: string }> {
  try {
    return await createUserAccountViaRpc(input)
  } catch (rpcErr) {
    const err = rpcErr as { code?: string; message?: string }
    if (!isMissingRpc(err, 'admin_create_user')) throw new Error(err.message ?? 'Failed to create user')
    try {
      return await createUserAccountViaEdge(input)
    } catch (edgeErr) {
      const msg = edgeErr instanceof Error ? edgeErr.message : String(edgeErr)
      if (msg.includes('FunctionsFetchError') || msg.includes('Failed to send')) {
        throw new Error(
          'Apply migration 0055_custom_app_auth.sql in Supabase SQL Editor, then try again.'
        )
      }
      throw edgeErr instanceof Error ? edgeErr : new Error(msg)
    }
  }
}

export async function resetUserPassword(userId: string, password: string): Promise<void> {
  const { error } = await client().rpc('admin_reset_user_password', {
    p_user_id: userId,
    p_password: password
  })
  if (!error) return
  if (!isMissingRpc(error, 'admin_reset_user_password')) throw new Error(error.message)

  const { data, error: edgeErr } = await client().functions.invoke('admin-users', {
    body: { action: 'reset_password', userId, password }
  })
  if (edgeErr) throw new Error(edgeErr.message)
  const payload = data as { error?: string }
  if (payload?.error) throw new Error(payload.error)
}

export async function updateUserAccount(userId: string, input: UpdateUserAccountInput): Promise<void> {
  if (input.fullName !== undefined || input.isActive !== undefined) {
    const { error } = await client().rpc('update_user_account', {
      p_user_id: userId,
      p_full_name: input.fullName ?? null,
      p_system_role_id: null,
      p_employee_id: null,
      p_is_active: input.isActive ?? null
    })
    if (error) throw new Error(error.message)
  }
  if (input.systemRoleId !== undefined || input.employeeId !== undefined) {
    await linkUserToEmployee(userId, input.employeeId ?? null, input.systemRoleId ?? null)
  }
}

export async function deactivateUserAccount(userId: string): Promise<void> {
  const { error } = await client().rpc('deactivate_user_account', { p_user_id: userId })
  if (error) throw new Error(error.message)
}

export async function removeUserPermissionOverride(userId: string, permissionId: string): Promise<void> {
  const { error } = await client().rpc('remove_user_permission_override', {
    p_user_id: userId,
    p_permission_id: permissionId
  })
  if (error) throw new Error(error.message)
}
