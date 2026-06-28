import { supabase } from '../lib/supabase'
import { getFactoryOrgUnits } from './factoryOrgService'
import { orgPathFromLeaf, orgPathLabel } from '../Utils/employeeOrgPicker'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export function avatarObjectPath(userId: string, ext: string): string {
  return `${userId}/avatar.${ext}`
}

export function publicAvatarUrl(path: string): string {
  const { data } = client().storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function updateMyProfile(input: { fullName?: string; avatarUrl?: string | null }): Promise<void> {
  const { error } = await client().rpc('update_my_profile', {
    p_full_name: input.fullName ?? null,
    p_avatar_url: input.avatarUrl === undefined ? null : input.avatarUrl
  })
  if (error) throw new Error(error.message)
}

export async function uploadMyAvatar(userId: string, file: File): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('AVATAR_TOO_LARGE')
  }
  const mime = file.type.toLowerCase()
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
    throw new Error('AVATAR_INVALID_TYPE')
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'jpg'
  const path = avatarObjectPath(userId, ext)

  const { error } = await client().storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
    contentType: mime
  })
  if (error) throw new Error(error.message)

  const url = publicAvatarUrl(path)
  await updateMyProfile({ avatarUrl: `${url}?t=${Date.now()}` })
  return url
}

export async function removeMyAvatar(userId: string): Promise<void> {
  const { data: listed } = await client().storage.from(AVATAR_BUCKET).list(userId)
  if (listed?.length) {
    const paths = listed.map(f => `${userId}/${f.name}`)
    await client().storage.from(AVATAR_BUCKET).remove(paths)
  }
  await updateMyProfile({ avatarUrl: '' })
}

export async function changeMyPassword(
  _email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { error } = await client().rpc('change_my_password', {
    p_current: currentPassword,
    p_new: newPassword
  })
  if (error) {
    if (error.message?.includes('WRONG_CURRENT_PASSWORD')) {
      throw new Error('WRONG_CURRENT_PASSWORD')
    }
    throw new Error(error.message)
  }
}

export type MyEmployeeSnapshot = {
  jobRole: string
  assignmentStatus: string | null
  orgUnitLabel: string | null
  stationLabel: string | null
  lineName: string | null
  managerNames: string[]
}

export async function fetchMyEmployeeSnapshot(employeeId: string): Promise<MyEmployeeSnapshot | null> {
  const { data, error } = await client()
    .from('employees')
    .select('job_role, assignment_status, factory_org_unit_id, line_name, stations(station_number, station_name)')
    .eq('id', employeeId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const units = await getFactoryOrgUnits()
  const orgUnitLabel = orgPathLabel(orgPathFromLeaf(data.factory_org_unit_id, units), units)
  const st = data.stations as { station_number?: string; station_name?: string } | null
  const stationLabel = st
    ? [st.station_number, st.station_name].filter(Boolean).join(' — ')
    : null

  const { data: mgrLinks } = await client()
    .from('employee_direct_managers')
    .select('manager:employees!employee_direct_managers_manager_id_fkey(full_name)')
    .eq('employee_id', employeeId)
    .order('sort_order')

  const managerNames = (mgrLinks ?? [])
    .map(row => {
      const m = row.manager as { full_name?: string } | { full_name?: string }[] | null
      if (Array.isArray(m)) return m[0]?.full_name
      return m?.full_name
    })
    .filter((n): n is string => Boolean(n))

  return {
    jobRole: String(data.job_role ?? ''),
    assignmentStatus: data.assignment_status ? String(data.assignment_status) : null,
    orgUnitLabel,
    stationLabel,
    lineName: data.line_name ? String(data.line_name) : null,
    managerNames
  }
}
