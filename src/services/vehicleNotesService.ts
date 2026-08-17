import { supabase } from '../lib/supabase'
import type { VehicleNote } from '../Types/vehicleNote'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type NoteRow = {
  id: string
  vehicle_id: string
  body: string
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  created_at: string
}

function mapNote(row: NoteRow): VehicleNote {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    body: row.body,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at
  }
}

export async function getVehicleNoteCounts(vehicleIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(vehicleIds.filter(Boolean))]
  const counts: Record<string, number> = {}
  if (ids.length === 0) return counts

  const chunkSize = 200
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    const { data, error } = await requireClient().from('vehicle_notes').select('vehicle_id').in('vehicle_id', slice)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const id = (row as { vehicle_id: string }).vehicle_id
      counts[id] = (counts[id] ?? 0) + 1
    }
  }
  return counts
}

export function notesCountForVehicleIds(vehicleIds: string[], counts: Record<string, number>): number {
  let total = 0
  for (const id of new Set(vehicleIds)) total += counts[id] ?? 0
  return total
}

export async function getVehicleNotes(vehicleId: string): Promise<VehicleNote[]> {
  const { data, error } = await requireClient()
    .from('v_vehicle_notes_detail')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as NoteRow[]).map(mapNote)
}

export async function addVehicleNote(vehicleId: string, body: string): Promise<VehicleNote> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('EMPTY_NOTE')

  const { data, error } = await requireClient()
    .from('vehicle_notes')
    .insert({ vehicle_id: vehicleId, body: trimmed })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const notes = await getVehicleNotes(vehicleId)
  const created = notes.find(n => n.id === data.id)
  if (created) return created

  return {
    id: data.id as string,
    vehicleId,
    body: trimmed,
    createdBy: null,
    createdByName: null,
    createdByEmail: null,
    createdAt: new Date().toISOString()
  }
}

export async function deleteVehicleNote(noteId: string): Promise<void> {
  const { error } = await requireClient().rpc('delete_vehicle_note', { p_note_id: noteId })
  if (error) throw new Error(error.message)
}

export async function clearVehicleNotes(vehicleId: string): Promise<void> {
  const { error } = await requireClient().rpc('clear_vehicle_notes_thread', { p_vehicle_id: vehicleId })
  if (error) throw new Error(error.message)
}
