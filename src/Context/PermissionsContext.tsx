import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { fetchCurrentUserPermissions, permissionKey } from '../services/permissionsService'
import type { PermissionMap } from '../Types/permissions'

type PermissionsContextValue = {
  permissions: PermissionMap
  loading: boolean
  loadError: boolean
  hasPermission: (module: string, action: string) => boolean
  canViewModule: (module: string) => boolean
  reload: (options?: { force?: boolean }) => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user?.id ?? null
  const accessToken = session?.access_token ?? null
  const [permissions, setPermissions] = useState<PermissionMap>({})
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const loadedForRef = useRef<string | null>(null)
  const inflightRef = useRef<Promise<void> | null>(null)

  const reload = useCallback(async (options?: { force?: boolean }) => {
    if (authLoading) return
    if (!userId) {
      setPermissions({})
      setLoading(false)
      setLoadError(false)
      loadedForRef.current = null
      return
    }

    if (options?.force) {
      loadedForRef.current = null
      setLoadError(false)
    }

    if (loadedForRef.current === userId) return
    if (inflightRef.current) {
      await inflightRef.current
      return
    }

    setLoading(true)

    const task = (async () => {
      const loadOnce = async () => {
        const next = await fetchCurrentUserPermissions()
        setPermissions(next)
        setLoadError(false)
        loadedForRef.current = userId
      }
      try {
        await loadOnce()
      } catch (err) {
        try {
          await new Promise(resolve => window.setTimeout(resolve, 800))
          const { ensureFreshSession } = await import('../services/authService')
          await ensureFreshSession()
          await loadOnce()
        } catch (retryErr) {
          console.error('Failed to load permissions:', retryErr ?? err)
          if (loadedForRef.current !== userId) setLoadError(true)
        }
      } finally {
        setLoading(false)
      }
    })()

    inflightRef.current = task
    try {
      await task
    } finally {
      inflightRef.current = null
    }
  }, [authLoading, userId])

  useEffect(() => {
    void reload()
  }, [reload, accessToken])

  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (permissions[permissionKey(module, action)]) return true
      if (action !== 'manage' && permissions[permissionKey(module, 'manage')]) return true
      if (permissions[permissionKey('users', 'manage')]) return true
      return false
    },
    [permissions]
  )

  const canViewModule = useCallback((module: string) => hasPermission(module, 'view'), [hasPermission])

  const value = useMemo(
    () => ({ permissions, loading, loadError, hasPermission, canViewModule, reload }),
    [permissions, loading, loadError, hasPermission, canViewModule, reload]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions must be used inside PermissionsProvider')
  return ctx
}
