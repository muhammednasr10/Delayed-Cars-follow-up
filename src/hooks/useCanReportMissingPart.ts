import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'

/** Who may open «تبليغ نقص جديد» — legacy roles + missing_parts.create permission. */
export function useCanReportMissingPart() {
  const { hasRole, role } = useAuth()
  const { hasPermission, loading: permsLoading } = usePermissions()
  const canReport =
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing') ||
    hasPermission('missing_parts', 'create')
  return { canReport, role, permsLoading }
}
