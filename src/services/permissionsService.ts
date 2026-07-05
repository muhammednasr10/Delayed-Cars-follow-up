import { supabase } from '../lib/supabase'
import type { PermissionMap, SystemPermission, SystemRole } from '../Types/permissions'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export function permissionKey(module: string, action: string): string {
  return `${module}.${action}`
}

export async function fetchCurrentUserPermissions(): Promise<PermissionMap> {
  const { data, error } = await client().rpc('get_current_user_permissions')
  if (error) throw new Error(error.message)
  return (data as PermissionMap) ?? {}
}

export async function checkPermission(module: string, action: string): Promise<boolean> {
  const { data, error } = await client().rpc('has_permission', {
    p_module: module,
    p_permission: action
  })
  if (error) return false
  return Boolean(data)
}

export async function getSystemRoles(): Promise<SystemRole[]> {
  const { data, error } = await client().from('system_roles').select('*').eq('is_active', true).order('role_name_ar')
  if (error) throw new Error(error.message)
  return (data ?? []) as SystemRole[]
}

export async function getSystemPermissions(): Promise<SystemPermission[]> {
  const { data, error } = await client()
    .from('system_permissions')
    .select('*')
    .eq('is_active', true)
    .order('module_key')
    .order('permission_key')
  if (error) throw new Error(error.message)
  return (data ?? []) as SystemPermission[]
}

export async function getRolePermissions(roleId: string): Promise<Map<string, boolean>> {
  const { data, error } = await client()
    .from('role_permissions')
    .select('allowed, system_permissions(module_key, permission_key)')
    .eq('role_id', roleId)
  if (error) throw new Error(error.message)
  const m = new Map<string, boolean>()
  for (const row of data ?? []) {
    const raw = row.system_permissions as
      | { module_key: string; permission_key: string }
      | { module_key: string; permission_key: string }[]
      | null
    const sp = Array.isArray(raw) ? raw[0] : raw
    if (!sp) continue
    m.set(permissionKey(sp.module_key, sp.permission_key), Boolean(row.allowed))
  }
  return m
}

export async function setRolePermission(roleId: string, permissionId: string, allowed: boolean): Promise<void> {
  const { error } = await client().rpc('set_role_permission', {
    p_role_id: roleId,
    p_permission_id: permissionId,
    p_allowed: allowed
  })
  if (error) {
    const { error: fallbackErr } = await client()
      .from('role_permissions')
      .upsert({ role_id: roleId, permission_id: permissionId, allowed }, { onConflict: 'role_id,permission_id' })
    if (fallbackErr) throw new Error(fallbackErr.message)
  }
}

export async function setUserPermissionOverride(
  userId: string,
  permissionId: string,
  allowed: boolean,
  reason?: string
): Promise<void> {
  const { error } = await client().rpc('set_user_permission_override', {
    p_user_id: userId,
    p_permission_id: permissionId,
    p_allowed: allowed,
    p_reason: reason ?? null
  })
  if (error) throw new Error(error.message)
}

export type UserPermissionState = {
  effective: Map<string, boolean>
  roleBase: Map<string, boolean>
  overrideKeys: Set<string>
}

/** صلاحيات المستخدم الفعلية = دور النظام + استثناءات المستخدم */
export async function getUserEffectivePermissions(
  allPermissions: SystemPermission[],
  userId: string,
  systemRoleId: string | null
): Promise<UserPermissionState> {
  const { getUserOverrides } = await import('./userAccountsService')
  const roleBase = systemRoleId ? await getRolePermissions(systemRoleId) : new Map<string, boolean>()
  const overrideRows = await getUserOverrides(userId)

  const overrideByPermId = new Map<string, boolean>()
  const overrideKeys = new Set<string>()
  for (const row of overrideRows) {
    const permId = row.permission_id as string
    overrideByPermId.set(permId, Boolean(row.allowed))
    const raw = row.system_permissions as
      | { module_key: string; permission_key: string }
      | { module_key: string; permission_key: string }[]
      | null
    const sp = Array.isArray(raw) ? raw[0] : raw
    if (sp) overrideKeys.add(permissionKey(sp.module_key, sp.permission_key))
  }

  const effective = new Map<string, boolean>()
  for (const p of allPermissions) {
    const key = permissionKey(p.module_key, p.permission_key)
    const ov = overrideByPermId.get(p.id)
    effective.set(key, ov !== undefined ? ov : (roleBase.get(key) ?? false))
  }

  return { effective, roleBase, overrideKeys }
}

export type SystemRoleInput = {
  roleCode: string
  roleNameAr: string
  roleNameEn?: string
  description?: string
}

export async function upsertSystemRole(roleId: string | null, input: SystemRoleInput): Promise<string> {
  const { data, error } = await client().rpc('upsert_system_role', {
    p_role_id: roleId,
    p_role_code: input.roleCode.trim(),
    p_role_name_ar: input.roleNameAr.trim(),
    p_role_name_en: input.roleNameEn?.trim() ?? null,
    p_description: input.description?.trim() ?? null
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function deleteSystemRole(roleId: string): Promise<void> {
  const { error } = await client().rpc('delete_system_role', { p_role_id: roleId })
  if (error) throw new Error(error.message)
}

export async function getAllSystemRoles(includeInactive = false): Promise<SystemRole[]> {
  let q = client().from('system_roles').select('*').order('role_name_ar')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as SystemRole[]
}

/** مسح كل استثناءات المستخدم — يعود لصلاحيات دوره فقط. */
export async function clearUserPermissionOverrides(userId: string): Promise<number> {
  const { getUserOverrides, removeUserPermissionOverride } = await import('./userAccountsService')
  const existing = await getUserOverrides(userId)
  for (const row of existing) {
    await removeUserPermissionOverride(userId, row.permission_id as string)
  }
  return existing.length
}

/** نسخ مصفوفة صلاحيات دور إلى دور آخر (يستبدل إعدادات الهدف). */
export async function copyRolePermissions(
  sourceRoleId: string,
  targetRoleId: string,
  allPermissions: SystemPermission[]
): Promise<number> {
  if (sourceRoleId === targetRoleId) throw new Error('SAME_SOURCE')
  const source = await getRolePermissions(sourceRoleId)
  let n = 0
  for (const p of allPermissions) {
    const key = permissionKey(p.module_key, p.permission_key)
    const allowed = source.get(key) ?? false
    await setRolePermission(targetRoleId, p.id, allowed)
    n++
  }
  return n
}

/**
 * يجعل صلاحيات المستخدم الهدف مطابقة للفعّالة لدى المصدر
 * عبر استثناءات نسبةً لدور الهدف (يمسح استثناءات الهدف أولاً).
 */
export async function copyUserPermissions(
  sourceUserId: string,
  targetUserId: string,
  allPermissions: SystemPermission[],
  sourceRoleId: string | null,
  targetRoleId: string | null
): Promise<number> {
  if (sourceUserId === targetUserId) throw new Error('SAME_SOURCE')
  const { getUserOverrides, removeUserPermissionOverride } = await import('./userAccountsService')
  const source = await getUserEffectivePermissions(allPermissions, sourceUserId, sourceRoleId)
  const targetRoleBase = targetRoleId ? await getRolePermissions(targetRoleId) : new Map<string, boolean>()

  const existing = await getUserOverrides(targetUserId)
  for (const row of existing) {
    await removeUserPermissionOverride(targetUserId, row.permission_id as string)
  }

  let n = 0
  for (const p of allPermissions) {
    const key = permissionKey(p.module_key, p.permission_key)
    const desired = source.effective.get(key) ?? false
    const roleDefault = targetRoleBase.get(key) ?? false
    if (desired !== roleDefault) {
      await setUserPermissionOverride(targetUserId, p.id, desired, 'Copied permissions')
      n++
    }
  }
  return n
}
