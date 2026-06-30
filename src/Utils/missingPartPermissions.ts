import type { UserRole } from '../Types/enums'
import type { PermissionMap } from '../Types/permissions'
import { permissionKey } from '../services/permissionsService'

const PRODUCTION_SYSTEM_ROLES = new Set([
  'supervisor',
  'production_manager',
  'general_manager',
  'engineer'
])

export type MissingPartsActionBits = {
  isAdmin: boolean
  hasRole: (...roles: UserRole[]) => boolean
  systemRoleCode: string | null
  permissions: PermissionMap
}

/** Explicit allow/deny from matrix wins; otherwise legacy default. */
export function resolveMissingPartAction(
  bits: MissingPartsActionBits,
  action: string,
  legacyDefault: () => boolean
): boolean {
  const key = permissionKey('missing_parts', action)
  if (bits.permissions[key] === true) return true
  if (bits.permissions[key] === false) return false
  if (bits.isAdmin || bits.permissions[permissionKey('users', 'manage')]) return true
  return legacyDefault()
}

type AuthBits = MissingPartsActionBits & {
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
  const canEdit = resolveMissingPartAction(bits, 'update', () =>
    elevated(bits) || productionLike(bits) || bits.hasRole('warehouse', 'purchasing')
  )

  const canInstall = resolveMissingPartAction(bits, 'bulk_install', () =>
    elevated(bits) || bits.hasRole('admin', 'production')
  )

  const canUpdateStatus = resolveMissingPartAction(bits, 'update_status', () =>
    elevated(bits) || bits.hasRole('admin', 'production', 'quality') || bits.hasPermission('missing_parts', 'approve')
  )

  const canComplete = resolveMissingPartAction(bits, 'complete', () =>
    elevated(bits) || productionLike(bits) || bits.hasPermission('missing_parts', 'approve')
  )

  const canDelete = resolveMissingPartAction(bits, 'delete', () => elevated(bits) || bits.hasRole('admin'))

  return { canEdit, canDelete, canInstall, canUpdateStatus, canComplete }
}
