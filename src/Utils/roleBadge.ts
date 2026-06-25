import type { Profile } from '../Context/AuthContext'

type TFn = (key: string) => string

/** Arabic/English label for the header role badge */
export function formatRoleBadge(profile: Profile | null | undefined, displayRole: string, t: TFn): string {
  if (!profile) return t('permissions.roleCodes.viewer')

  if (profile.system_role_name_ar?.trim()) {
    return profile.system_role_name_ar.trim()
  }

  const code = profile.system_role_code
  if (code) {
    const key = `permissions.roleCodes.${code}`
    const label = t(key)
    if (label !== key) return label
    return code
  }

  if (profile.system_role_id) {
    return t('common.loading')
  }

  const legacyKey = `permissions.legacyRole.${profile.role}`
  const legacyLabel = t(legacyKey)
  if (legacyLabel !== legacyKey) return legacyLabel

  return displayRole === 'viewer' ? t('permissions.roleCodes.viewer') : displayRole
}
