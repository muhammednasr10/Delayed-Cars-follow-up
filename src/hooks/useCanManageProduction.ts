import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'

/** تعديل بيانات الإنتاج/التخطيط — دور legacy أو صلاحيات production */
export function useCanManageProduction(): boolean {
  const { hasRole, isAdmin } = useAuth()
  const { hasPermission } = usePermissions()
  if (isAdmin || hasRole('admin', 'production')) return true
  return (
    hasPermission('production', 'manage') ||
    hasPermission('production', 'update') ||
    hasPermission('production', 'create')
  )
}
