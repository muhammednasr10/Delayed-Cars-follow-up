import { supabase } from '../lib/supabase'
import type { TeamMissionResponse } from '../Types/mission'
import {
  MISSION_RESPONSE_MAX_FILES,
  missionResponseFileError,
  missionResponseFileExt,
  missionResponseResolvedMime
} from '../Utils/missionResponseFiles'

const RESPONSE_IMAGE_BUCKET = 'mission-responses'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

export async function respondMyTeamMission(
  missionId: string,
  response: string,
  files: File[] = []
): Promise<void> {
  const text = response.trim()
  if (!text) throw new Error('RESPONSE_REQUIRED')
  if (files.length > MISSION_RESPONSE_MAX_FILES) throw new Error('FILE_TOO_MANY')
  for (const file of files) {
    const err = missionResponseFileError(file)
    if (err === 'too_large') throw new Error('IMAGE_TOO_LARGE')
    if (err === 'invalid_type') throw new Error('IMAGE_INVALID_TYPE')
  }

  const { data, error } = await requireClient().rpc('respond_my_team_mission', {
    p_mission_id: missionId,
    p_response: text
  })
  if (error) {
    if (error.message?.includes('RESPONSE_REQUIRED')) throw new Error('RESPONSE_REQUIRED')
    if (error.message?.includes('MISSION_NOT_ASSIGNEE')) throw new Error('MISSION_NOT_ASSIGNEE')
    if (error.message?.includes('NO_EMPLOYEE_LINK')) throw new Error('NO_EMPLOYEE_LINK')
    if (error.message?.includes('MISSION_NOT_FOUND')) throw new Error('MISSION_NOT_FOUND')
    throw new Error(error.message)
  }

  const responseId = typeof data === 'string' ? data : null
  if (!responseId || files.length === 0) return
  await uploadMissionResponseFiles(missionId, responseId, files)
}

function missionResponseImageUrl(path: string): string {
  const { data } = requireClient().storage.from(RESPONSE_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function uploadMissionResponseFiles(missionId: string, responseId: string, files: File[]): Promise<void> {
  const client = requireClient()
  for (const [index, file] of files.entries()) {
    const mime = missionResponseResolvedMime(file)
    const path = `${missionId}/${responseId}/${Date.now()}-${index}.${missionResponseFileExt(mime)}`
    const { error: uploadError } = await client.storage.from(RESPONSE_IMAGE_BUCKET).upload(path, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: mime
    })
    if (uploadError) throw new Error(uploadError.message)
    const { error: attachError } = await client.rpc('attach_team_mission_response_file', {
      p_response_id: responseId,
      p_file_path: path,
      p_file_name: file.name,
      p_mime_type: mime
    })
    if (attachError) {
      if (attachError.message?.includes('FILE_TOO_MANY')) throw new Error('FILE_TOO_MANY')
      if (attachError.message?.includes('MISSION_NOT_ASSIGNEE')) throw new Error('MISSION_NOT_ASSIGNEE')
      throw new Error(attachError.message)
    }
  }
}

type AttachmentRow = {
  id: string
  file_path: string
  file_name: string
  mime_type: string
}

type ResponseRow = {
  id: string
  mission_id: string
  author_employee_id: string | null
  author_name: string
  body: string
  created_at: string
  team_mission_response_attachments?: AttachmentRow[] | null
}

function mapResponse(row: ResponseRow): TeamMissionResponse {
  return {
    id: row.id,
    missionId: row.mission_id,
    authorEmployeeId: row.author_employee_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    attachments: (row.team_mission_response_attachments ?? []).map(file => ({
      id: file.id,
      filePath: file.file_path,
      fileName: file.file_name,
      mimeType: file.mime_type,
      url: missionResponseImageUrl(file.file_path)
    }))
  }
}

export async function getTeamMissionResponses(missionId: string): Promise<TeamMissionResponse[]> {
  const client = requireClient()
  const withFiles = await client
    .from('team_mission_responses')
    .select(
      'id, mission_id, author_employee_id, author_name, body, created_at, team_mission_response_attachments(id, file_path, file_name, mime_type)'
    )
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true })
  if (!withFiles.error) {
    return ((withFiles.data ?? []) as ResponseRow[]).map(mapResponse)
  }
  const missingRel = withFiles.error.message.toLowerCase()
  if (
    !missingRel.includes('schema cache') &&
    !missingRel.includes('could not find') &&
    !missingRel.includes('does not exist')
  ) {
    throw new Error(withFiles.error.message)
  }

  const { data, error } = await client
    .from('team_mission_responses')
    .select('id, mission_id, author_employee_id, author_name, body, created_at')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as ResponseRow[]).map(mapResponse)
}
