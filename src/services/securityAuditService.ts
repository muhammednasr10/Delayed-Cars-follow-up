import { supabase } from '../lib/supabase'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export const PERMISSION_AUDIT_ACTIONS = [
  'permission_override',
  'remove_permission_override',
  'role_permission',
  'update_user_role',
  'create_system_role',
  'update_system_role',
  'delete_system_role'
] as const

export type PermissionAuditAction = (typeof PERMISSION_AUDIT_ACTIONS)[number]

export type PermissionAuditEvent = {
  id: string
  actorUserId: string | null
  actorEmail: string | null
  actorName: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  reason: string | null
  createdAt: string
}

type Row = {
  id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  reason: string | null
  created_at: string
  profiles?: { email: string | null; full_name: string | null } | { email: string | null; full_name: string | null }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function mapRow(row: Row): PermissionAuditEvent {
  const actor = relOne(row.profiles)
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorEmail: actor?.email ?? null,
    actorName: actor?.full_name ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    reason: row.reason,
    createdAt: row.created_at
  }
}

export async function getPermissionAuditEvents(limit = 150): Promise<PermissionAuditEvent[]> {
  const { data, error } = await client()
    .from('security_audit_events')
    .select('id, actor_user_id, action, entity_type, entity_id, old_values, new_values, reason, created_at, profiles:actor_user_id(email, full_name)')
    .in('action', [...PERMISSION_AUDIT_ACTIONS])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Fallback if FK embed name differs
    const fallback = await client()
      .from('security_audit_events')
      .select('id, actor_user_id, action, entity_type, entity_id, old_values, new_values, reason, created_at')
      .in('action', [...PERMISSION_AUDIT_ACTIONS])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (fallback.error) throw new Error(fallback.error.message)
    const rows = (fallback.data ?? []) as Row[]
    const actorIds = [...new Set(rows.map(r => r.actor_user_id).filter(Boolean))] as string[]
    const actors = new Map<string, { email: string | null; full_name: string | null }>()
    if (actorIds.length > 0) {
      const { data: profiles } = await client().from('profiles').select('id, email, full_name').in('id', actorIds)
      for (const p of profiles ?? []) {
        actors.set(p.id as string, { email: p.email as string | null, full_name: p.full_name as string | null })
      }
    }
    return rows.map(row => {
      const actor = row.actor_user_id ? actors.get(row.actor_user_id) : null
      return {
        id: row.id,
        actorUserId: row.actor_user_id,
        actorEmail: actor?.email ?? null,
        actorName: actor?.full_name ?? null,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        oldValues: row.old_values,
        newValues: row.new_values,
        reason: row.reason,
        createdAt: row.created_at
      }
    })
  }

  return ((data ?? []) as Row[]).map(mapRow)
}
