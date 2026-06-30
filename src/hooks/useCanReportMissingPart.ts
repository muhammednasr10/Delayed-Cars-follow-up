import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { resolveMissingPartAction, type MissingPartsActionBits } from '../Utils/missingPartPermissions'

/** Who may open «تبليغ نقص جديد» — respects explicit deny in permissions matrix. */
export function useCanReportMissingPart() {
  const { hasRole, role, isAdmin, systemRoleCode } = useAuth()
  const { permissions, loading: permsLoading } = usePermissions()
  const bits: MissingPartsActionBits = { isAdmin, hasRole, systemRoleCode, permissions }
  const canReport = resolveMissingPartAction(bits, 'create', () =>
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing')
  )
  return { canReport, role, permsLoading }
}
