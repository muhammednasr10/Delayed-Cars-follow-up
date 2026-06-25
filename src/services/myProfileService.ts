import { supabase } from '../lib/supabase'

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
