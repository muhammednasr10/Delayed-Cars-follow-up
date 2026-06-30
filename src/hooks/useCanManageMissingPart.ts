import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { canManageMissingParts } from '../Utils/missingPartPermissions'

/** Edit / status / complete — legacy roles, system roles, and missing_parts permissions. */
export function useCanManageMissingPart() {
  const { hasRole, isAdmin, systemRoleCode } = useAuth()
  const { hasPermission, permissions } = usePermissions()

  return canManageMissingParts({
    isAdmin,
    hasRole,
    systemRoleCode,
    permissions,
    hasPermission
  })
}
