import { useCallback, useMemo } from 'react'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanAccessSettings } from './useCanAccessSettings'
import { permissionKey } from '../services/permissionsService'
import {
  type AppPageDef,
  type AppPagePermissionKey,
  pageDefByPermKey
} from '../config/pageAccess'

export function useCanViewPage() {
  const { permissions, hasPermission, loading } = usePermissions()
  const { canAccess: canAccessSettings, loading: settingsLoading } = useCanAccessSettings()

  const pagesConfigured = useMemo(
    () => Object.keys(permissions).some(k => k.startsWith('pages.')),
    [permissions]
  )

  const canViewPage = useCallback(
    (permKey: AppPagePermissionKey | undefined, options?: { settingsFallback?: boolean }): boolean => {
      if (!permKey) return true
      if (loading || settingsLoading) return true

      const def = pageDefByPermKey(permKey)
      const key = permissionKey('pages', permKey)

      if (permKey === 'production_settings' || options?.settingsFallback) {
        if (canAccessSettings) return true
      }

      if (pagesConfigured) {
        return Boolean(permissions[key])
      }

      if (permissions[key] === true) return true
      if (permissions[key] === false) return false

      if (def?.fallbackModule) return hasPermission(def.fallbackModule, 'view')
      return def?.defaultVisible ?? true
    },
    [permissions, hasPermission, loading, settingsLoading, pagesConfigured, canAccessSettings]
  )

  const canViewPageDef = useCallback(
    (def: AppPageDef) => canViewPage(def.permKey, { settingsFallback: def.permKey === 'production_settings' }),
    [canViewPage]
  )

  return { canViewPage, canViewPageDef, loading: loading || settingsLoading }
}
