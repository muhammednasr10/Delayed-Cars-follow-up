import { useMemo } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'

/** Settings hub: legacy admin, system role admin/super_admin, or explicit settings/users manage permission. */
export function useCanAccessSettings() {
  const { profile } = useAuth()
  const { hasPermission, loading } = usePermissions()

  const canAccess = useMemo(
    () =>
      profileIsAdmin(profile) ||
      hasPermission('settings', 'manage') ||
      hasPermission('users', 'manage'),
    [profile, hasPermission]
  )

  return { canAccess, loading }
}
