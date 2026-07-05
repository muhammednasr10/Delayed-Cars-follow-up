import { supabase } from '../lib/supabase'
import type { ScratchInput, ScratchRecord, ScratchSeverity } from '../Types/scratch'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  id: string
  vin: string
  body_area: string
  factory_org_unit_id: string | null
  severity: ScratchSeverity
  recorded_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: Row): ScratchRecord {
  return {
    id: row.id,
    vin: row.vin,
    bodyArea: row.body_area,
    factoryOrgUnitId: row.factory_org_unit_id,
    severity: row.severity,
    recordedAt: row.recorded_at,
    notes: row.notes ?? undefined
  }
}

function toPayload(input: ScratchInput) {
  return {
    vin: input.vin.trim().toUpperCase(),
    body_area: input.bodyArea.trim(),
    factory_org_unit_id: input.factoryOrgUnitId || null,
    severity: input.severity,
    recorded_at: input.recordedAt,
    notes: input.notes?.trim() || null
  }
}

export async function getScratches(): Promise<ScratchRecord[]> {
  const { data, error } = await requireClient()
    .from('scratches')
    .select('*')
    .order('recorded_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Row[]).map(mapRow)
}

export async function createScratch(input: ScratchInput): Promise<ScratchRecord> {
  const { data, error } = await requireClient()
    .from('scratches')
    .insert(toPayload(input))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow(data as Row)
}

export async function deleteScratch(id: string): Promise<void> {
  const { error } = await requireClient().from('scratches').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
