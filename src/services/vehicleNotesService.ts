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
