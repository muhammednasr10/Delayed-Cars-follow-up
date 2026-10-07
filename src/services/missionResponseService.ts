import { supabase } from '../lib/supabase'
import type { MissionTimelineEntry, TeamMissionActivity, TeamMissionResponse } from '../Types/mission'
import { isMissionSchemaMissing } from '../Utils/missionDisplay'
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

type ActivityRow = {
  id: string
  mission_id: string
  author_name: string
  field_key: string
  value_from: string | null
  value_to: string | null
  created_at: string
}

function mapActivity(row: ActivityRow): TeamMissionActivity {
  return {
    id: row.id,
    missionId: row.mission_id,
    authorName: row.author_name,
    field: row.field_key,
    fromValue: row.value_from,
    toValue: row.value_to,
    createdAt: row.created_at
  }
}

export async function getTeamMissionActivity(missionId: string): Promise<TeamMissionActivity[]> {
  const { data, error } = await requireClient()
    .from('team_mission_activity')
    .select('id, mission_id, author_name, field_key, value_from, value_to, created_at')
    .eq('mission_id', missionId)
    .order('created_at', { ascending: true })
  if (error) {
    if (isMissionSchemaMissing(error.message)) return []
    throw new Error(error.message)
  }
  return ((data ?? []) as ActivityRow[]).map(mapActivity)
}

export async function getMissionTimeline(missionId: string): Promise<MissionTimelineEntry[]> {
  const [replies, changes] = await Promise.all([
    getTeamMissionResponses(missionId),
    getTeamMissionActivity(missionId)
  ])
  const entries: MissionTimelineEntry[] = [
    ...replies.map(item => ({ kind: 'reply' as const, ...item })),
    ...changes.map(item => ({ kind: 'change' as const, ...item }))
  ]
  entries.sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt)
    if (byTime !== 0) return byTime
    if (a.kind === b.kind) return 0
    return a.kind === 'reply' ? -1 : 1
  })
  return entries
}
