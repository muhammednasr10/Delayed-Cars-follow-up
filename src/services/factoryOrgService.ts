import { supabase } from '../lib/supabase'
import type { FactoryOrgUnit, FactoryOrgUnitInput } from '../Types/factoryOrg'
import { validateFactoryOrgParent } from '../Utils/factoryOrgHierarchy'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

type Row = {
  id: string
  name: string
  parent_id: string | null
  unit_kind: FactoryOrgUnit['unitKind']
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

function mapRow(row: Row, parentName?: string | null): FactoryOrgUnit {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    parentName: parentName ?? null,
    unitKind: row.unit_kind,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function getFactoryOrgUnits(opts?: { includeInactive?: boolean }): Promise<FactoryOrgUnit[]> {
  let q = requireClient().from('factory_org_units').select('*').order('sort_order').order('name')
  if (!opts?.includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Row[]
  const nameById = new Map(rows.map(r => [r.id, r.name]))
  return rows.map(r => mapRow(r, r.parent_id ? nameById.get(r.parent_id) ?? null : null))
}

async function getParentUnit(parentId: string | null | undefined): Promise<FactoryOrgUnit | null> {
  if (!parentId) return null
  const { data, error } = await requireClient().from('factory_org_units').select('*').eq('id', parentId).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data as Row) : null
}

export async function createFactoryOrgUnit(input: FactoryOrgUnitInput): Promise<FactoryOrgUnit> {
  const parent = await getParentUnit(input.parentId)
  if (!validateFactoryOrgParent(input.unitKind, parent)) {
    throw new Error('INVALID_ORG_PARENT')
  }
  const { data, error } = await requireClient()
    .from('factory_org_units')
    .insert({
      name: input.name.trim(),
      parent_id: input.parentId || null,
      unit_kind: input.unitKind,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row, parent?.name ?? null)
}

export async function updateFactoryOrgUnit(
  id: string,
  input: Partial<Pick<FactoryOrgUnitInput, 'name' | 'sortOrder' | 'isActive'>>
): Promise<FactoryOrgUnit> {
  const payload: Record<string, unknown> = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.sortOrder != null) payload.sort_order = input.sortOrder
  if (input.isActive != null) payload.is_active = input.isActive
  const { data, error } = await requireClient().from('factory_org_units').update(payload).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function deleteFactoryOrgUnit(id: string): Promise<void> {
  const { count, error: childErr } = await requireClient()
    .from('factory_org_units')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
  if (childErr) throw new Error(childErr.message)
  if ((count ?? 0) > 0) throw new Error('ORG_UNIT_HAS_CHILDREN')
  const { error } = await requireClient().from('factory_org_units').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
