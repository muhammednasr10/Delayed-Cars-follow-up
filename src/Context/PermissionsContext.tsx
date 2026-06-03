import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { fetchCurrentUserPermissions, permissionKey } from '../services/permissionsService'
import type { PermissionMap } from '../Types/permissions'

type PermissionsContextValue = {
  permissions: PermissionMap
  loading: boolean
  hasPermission: (module: string, action: string) => boolean
  canViewModule: (module: string) => boolean
  reload: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!session) {
      setPermissions({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPermissions(await fetchCurrentUserPermissions())
    } catch {
      setPermissions({})
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload, profile?.id])

  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (permissions[permissionKey(module, action)]) return true
      if (permissions[permissionKey('users', 'manage')]) return true
      return false
    },
    [permissions]
  )

  const canViewModule = useCallback((module: string) => hasPermission(module, 'view'), [hasPermission])

  const value = useMemo(
    () => ({ permissions, loading, hasPermission, canViewModule, reload }),
    [permissions, loading, hasPermission, canViewModule, reload]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions must be used inside PermissionsProvider')
  return ctx
}
