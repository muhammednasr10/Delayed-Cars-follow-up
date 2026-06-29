import type { UserRole } from '../Types/enums'

const PRODUCTION_SYSTEM_ROLES = new Set([
  'supervisor',
  'production_manager',
  'general_manager',
  'engineer'
])

type AuthBits = {
  isAdmin: boolean
  hasRole: (...roles: UserRole[]) => boolean
  systemRoleCode: string | null
  hasPermission: (module: string, action: string) => boolean
}

function elevated(bits: AuthBits): boolean {
  return bits.isAdmin || bits.hasPermission('users', 'manage')
}

function productionLike(bits: AuthBits): boolean {
  return (
    bits.hasRole('admin', 'production', 'quality') ||
    (bits.systemRoleCode !== null && PRODUCTION_SYSTEM_ROLES.has(bits.systemRoleCode))
  )
}

/** Mirrors DB can_manage_missing_parts + UI expectations. */
export function canManageMissingParts(bits: AuthBits) {
  const canEdit =
    elevated(bits) ||
    productionLike(bits) ||
    bits.hasRole('warehouse', 'purchasing') ||
    bits.hasPermission('missing_parts', 'update')

  const canInstall =
    elevated(bits) || bits.hasRole('admin', 'production') || bits.hasPermission('missing_parts', 'update')

  const canUpdateStatus =
    canInstall || bits.hasRole('quality') || bits.hasPermission('missing_parts', 'approve')

  const canComplete =
    elevated(bits) ||
    productionLike(bits) ||
    bits.hasPermission('missing_parts', 'update') ||
    bits.hasPermission('missing_parts', 'approve')

  const canDelete = elevated(bits) || bits.hasRole('admin')

  return { canEdit, canDelete, canInstall, canUpdateStatus, canComplete }
}
