import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  const [loading, setLoading] = useState(false)
  const loadedForRef = useRef<string | null>(null)
  const inflightRef = useRef<Promise<void> | null>(null)

  const reload = useCallback(async () => {
    if (!session) {
      setPermissions({})
      setLoading(false)
      loadedForRef.current = null
      return
    }

    const cacheKey = profile?.id ?? session.user.id
    if (loadedForRef.current === cacheKey && inflightRef.current) {
      await inflightRef.current
      return
    }

    const firstLoad = loadedForRef.current !== cacheKey
    if (firstLoad) setLoading(true)

    const task = (async () => {
      try {
        const next = await fetchCurrentUserPermissions()
        setPermissions(next)
        loadedForRef.current = cacheKey
      } catch {
        if (firstLoad) setPermissions({})
      } finally {
        if (firstLoad) setLoading(false)
      }
    })()

    inflightRef.current = task
    await task
    inflightRef.current = null
  }, [session, profile?.id])

  useEffect(() => {
    void reload()
  }, [reload])

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
