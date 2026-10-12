import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { permissionKey } from '../services/permissionsService'

const ACTIONS = ['create', 'update', 'delete'] as const

/**
 * إضافة/تعديل/حذف لصفحة فرعية. لو الصلاحية لسه مش متظبطة على الدور، نرجع لصلاحية الوحدة.
 */
export function usePageCrud(pagePerm: string, fallbackModule: string) {
  const { hasRole } = useAuth()
  const { permissions, hasPermission } = usePermissions()
  const isAdmin = hasRole('admin')

  function allowed(action: (typeof ACTIONS)[number]): boolean {
    if (isAdmin) return true
    const key = permissionKey('pages', `${pagePerm}::${action}`)
    if (permissions[key] === false) return false
    if (permissions[key] === true) return true
    return hasPermission(fallbackModule, action) || hasPermission(fallbackModule, 'manage')
  }

  const canCreate = allowed('create')
  const canUpdate = allowed('update')
  const canDelete = allowed('delete')
  return { canCreate, canUpdate, canDelete, canManage: canCreate || canUpdate || canDelete }
}
