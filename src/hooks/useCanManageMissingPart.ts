import { useAuth, profileIsAdmin } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'

/** Edit / status / complete — legacy roles + missing_parts.update + admins. */
export function useCanManageMissingPart() {
  const { hasRole, isAdmin } = useAuth()
  const { hasPermission } = usePermissions()

  const elevated = isAdmin || hasPermission('users', 'manage')

  const canEdit =
    elevated ||
    hasRole('admin', 'production', 'warehouse', 'purchasing') ||
    hasPermission('missing_parts', 'update')

  const canDelete = elevated || hasRole('admin')

  const canInstall =
    elevated ||
    hasRole('admin', 'production') ||
    hasPermission('missing_parts', 'update')

  const canUpdateStatus = canInstall || hasRole('quality') || hasPermission('missing_parts', 'approve')

  const canComplete =
    elevated ||
    hasRole('admin', 'production', 'quality') ||
    hasPermission('missing_parts', 'update') ||
    hasPermission('missing_parts', 'approve')

  return { canEdit, canDelete, canInstall, canUpdateStatus, canComplete }
}
