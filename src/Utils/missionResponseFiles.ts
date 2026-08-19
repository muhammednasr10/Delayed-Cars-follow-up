export const MISSION_RESPONSE_MAX_FILES = 3
export const MISSION_RESPONSE_MAX_BYTES = 5 * 1024 * 1024
export const MISSION_RESPONSE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
] as const
export const MISSION_RESPONSE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf'

export type MissionResponseFileError = 'too_large' | 'invalid_type' | 'too_many'

export function missionResponseResolvedMime(file: File): string {
  const mime = file.type.toLowerCase()
  if (mime) return mime
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  return ''
}

export function isMissionResponseImage(mime: string): boolean {
  return mime.startsWith('image/')
}

export function missionResponseFileExt(mime: string): string {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function missionResponseFileError(file: File): Exclude<MissionResponseFileError, 'too_many'> | null {
  const mime = missionResponseResolvedMime(file)
  if (!(MISSION_RESPONSE_MIME_TYPES as readonly string[]).includes(mime)) return 'invalid_type'
  if (file.size > MISSION_RESPONSE_MAX_BYTES) return 'too_large'
  return null
}

export function appendMissionResponseFiles(
  current: File[],
  incoming: File[]
): { files: File[]; error: MissionResponseFileError | null } {
  const next = [...current]
  for (const file of incoming) {
    if (next.length >= MISSION_RESPONSE_MAX_FILES) {
      return { files: next, error: 'too_many' }
    }
    const err = missionResponseFileError(file)
    if (err) return { files: next, error: err }
    next.push(file)
  }
  return { files: next, error: null }
}
