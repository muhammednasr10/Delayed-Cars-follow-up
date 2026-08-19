import { supabase } from '../lib/supabase'
import type { ScratchNote } from '../Types/scratch'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type NoteRow = {
  id: string
  scratch_id: string
  body: string
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  created_at: string
}

function mapNote(row: NoteRow): ScratchNote {
  return {
    id: row.id,
    scratchId: row.scratch_id,
    body: row.body,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at
  }
}

export async function getScratchNoteCounts(scratchIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(scratchIds.filter(Boolean))]
  const counts: Record<string, number> = {}
  if (ids.length === 0) return counts

  const chunkSize = 200
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    const { data, error } = await requireClient().from('scratch_notes').select('scratch_id').in('scratch_id', slice)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const id = (row as { scratch_id: string }).scratch_id
      counts[id] = (counts[id] ?? 0) + 1
    }
  }
  return counts
}

export async function getScratchNotes(scratchId: string): Promise<ScratchNote[]> {
  const { data, error } = await requireClient()
    .from('v_scratch_notes_detail')
    .select('*')
    .eq('scratch_id', scratchId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as NoteRow[]).map(mapNote)
}

export async function addScratchNote(scratchId: string, body: string): Promise<ScratchNote> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('EMPTY_NOTE')
  const { data, error } = await requireClient()
    .from('scratch_notes')
    .insert({ scratch_id: scratchId, body: trimmed })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const notes = await getScratchNotes(scratchId)
  const created = notes.find(n => n.id === data.id)
  if (created) return created
  return {
    id: data.id as string,
    scratchId,
    body: trimmed,
    createdBy: null,
    createdByName: null,
    createdByEmail: null,
    createdAt: new Date().toISOString()
  }
}

export async function deleteScratchNote(noteId: string): Promise<void> {
  const { error } = await requireClient().from('scratch_notes').delete().eq('id', noteId)
  if (error) throw new Error(error.message)
}

export async function clearScratchNotes(scratchId: string): Promise<void> {
  const { error } = await requireClient().from('scratch_notes').delete().eq('scratch_id', scratchId)
  if (error) throw new Error(error.message)
}
