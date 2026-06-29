const PERMISSION_DENIED_PATTERNS = [
  /permission denied/i,
  /not authorized/i,
  /not authorised/i,
  /row-level security/i,
  /violates row-level security/i,
  /insufficient_privilege/i,
  /\b42501\b/,
  /new row violates/i,
  /must be owner of/i,
  /access denied/i
]

export function isPermissionDeniedMessage(message: string): boolean {
  const m = message.trim()
  if (!m) return false
  return PERMISSION_DENIED_PATTERNS.some(pattern => pattern.test(m))
}

export function formatUserFacingError(message: string, notPermittedLabel: string): string {
  if (isPermissionDeniedMessage(message)) return notPermittedLabel
  return message
}

export function errorMessageFromUnknown(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}
