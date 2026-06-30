import { useCallback, useMemo } from 'react'
import { useAuth } from '../Context/AuthContext'
import { usePermissions } from '../Context/PermissionsContext'
import { useCanViewPage } from './useCanViewPage'
import type { ListTab } from '../Components/missingParts/MissingPartsToolbar'
import { resolveMissingPartAction, type MissingPartsActionBits } from '../Utils/missingPartPermissions'
import { permissionKey } from '../services/permissionsService'

const TAB_PAGE_KEYS: Record<ListTab, string> = {
  active: 'active',
  summary: 'summary',
  history: 'history',
  historySummary: 'historySummary'
}

export function useMissingPartsUiPermissions() {
  const { hasRole, role, isAdmin, systemRoleCode } = useAuth()
  const { permissions, loading: permsLoading } = usePermissions()
  const { canViewTab, loading: pagesLoading } = useCanViewPage()

  const bits: MissingPartsActionBits = useMemo(
    () => ({
      isAdmin,
      hasRole,
      systemRoleCode,
      permissions
    }),
    [isAdmin, hasRole, systemRoleCode, permissions]
  )

  const canViewListTab = useCallback(
    (tab: ListTab) => canViewTab('production_missing', TAB_PAGE_KEYS[tab]),
    [canViewTab]
  )

  const visibleTabs = useMemo(() => {
    const all: ListTab[] = ['active', 'summary', 'history', 'historySummary']
    if (permsLoading || pagesLoading) return all
    const allowed = all.filter(canViewListTab)
    return allowed.length > 0 ? allowed : all
  }, [canViewListTab, permsLoading, pagesLoading])

  const canReport = resolveMissingPartAction(bits, 'create', () =>
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing')
  )

  const canFilter = resolveMissingPartAction(bits, 'filter', () =>
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing') ||
    Boolean(permissions[permissionKey('missing_parts', 'view')])
  )

  const canExport = resolveMissingPartAction(bits, 'export', () =>
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing') ||
    Boolean(permissions[permissionKey('missing_parts', 'view')])
  )

  const canUpdateStatus = resolveMissingPartAction(bits, 'update_status', () =>
    bits.isAdmin ||
    bits.hasRole('admin', 'production') ||
    bits.hasRole('quality') ||
    Boolean(permissions[permissionKey('missing_parts', 'update')]) ||
    Boolean(permissions[permissionKey('missing_parts', 'approve')])
  )

  const canNotes = resolveMissingPartAction(bits, 'notes', () =>
    hasRole('admin', 'production', 'warehouse', 'quality', 'purchasing') ||
    Boolean(permissions[permissionKey('missing_parts', 'view')])
  )

  const canEdit = resolveMissingPartAction(bits, 'update', () => {
    const elevated = bits.isAdmin || Boolean(permissions[permissionKey('users', 'manage')])
    const productionLike =
      bits.hasRole('admin', 'production', 'quality') ||
      (bits.systemRoleCode !== null &&
        ['supervisor', 'production_manager', 'general_manager', 'engineer'].includes(bits.systemRoleCode))
    return elevated || productionLike || bits.hasRole('warehouse', 'purchasing')
  })

  const canDelete = resolveMissingPartAction(bits, 'delete', () => bits.isAdmin || bits.hasRole('admin'))

  const canComplete = resolveMissingPartAction(bits, 'complete', () => {
    const elevated = bits.isAdmin || Boolean(permissions[permissionKey('users', 'manage')])
    const productionLike =
      bits.hasRole('admin', 'production', 'quality') ||
      (bits.systemRoleCode !== null &&
        ['supervisor', 'production_manager', 'general_manager', 'engineer'].includes(bits.systemRoleCode))
    return (
      elevated ||
      productionLike ||
      Boolean(permissions[permissionKey('missing_parts', 'update')]) ||
      Boolean(permissions[permissionKey('missing_parts', 'approve')])
    )
  })

  const canBulkInstall = resolveMissingPartAction(bits, 'bulk_install', () =>
    bits.isAdmin || bits.hasRole('admin', 'production') || Boolean(permissions[permissionKey('missing_parts', 'update')])
  )

  return {
    role,
    permsLoading: permsLoading || pagesLoading,
    visibleTabs,
    canViewListTab,
    canReport,
    canFilter,
    canExport,
    canUpdateStatus,
    canNotes,
    canEdit,
    canDelete,
    canComplete,
    canBulkInstall,
    canBulkInstallAndUpdate: canBulkInstall && canUpdateStatus
  }
}
