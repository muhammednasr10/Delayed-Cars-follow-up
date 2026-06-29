import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Eye, Search, Shield, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { permissionKey } from '../../services/permissionsService'
import type { SystemPermission, SystemRole, UserAccountDetail } from '../../Types/permissions'
import type { MatrixTreeNode } from '../../config/permissionsMatrixTree'
import { PERMISSIONS_MATRIX_TREE } from '../../config/permissionsMatrixTree'
import {
  collectPermissionsForSubtree,
  countEnabled,
  filterMatrixTree,
  permissionsForNode
} from '../../Utils/permissionsMatrixResolve'
import {
  permissionActionDescription,
  permissionActionLabel,
  sortActionsForMatrix
} from '../../Utils/permissionLabels'

type MatrixMode = 'role' | 'user'

type Props = {
  mode: MatrixMode
  onModeChange: (mode: MatrixMode) => void
  roles: SystemRole[]
  users: UserAccountDetail[]
  permissions: SystemPermission[]
  selectedRoleId: string
  selectedUserId: string
  onSelectRole: (id: string) => void
  onSelectUser: (id: string) => void
  rolePerms: Map<string, boolean>
  overrideKeys?: Set<string>
  roleBasePerms?: Map<string, boolean>
  onSetPermission: (permissionId: string, allowed: boolean) => Promise<void>
  onSetPermissions: (permissionIds: string[], allowed: boolean) => Promise<void>
  onError: (message: string) => void
}

function PermToggleCard({
  perm,
  allowed,
  isOverride,
  roleDefault,
  isUserMode,
  disabled,
  busy,
  t,
  onToggle
}: {
  perm: SystemPermission
  allowed: boolean
  isOverride: boolean
  roleDefault: boolean | undefined
  isUserMode: boolean
  disabled: boolean
  busy: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
  onToggle: () => void
}) {
  const isPage = perm.module_key === 'pages'
  const actionLabel = isPage
    ? t('permissions.matrix.pageVisibility')
    : permissionActionLabel(perm.permission_key, t)
  const actionDesc = isPage
    ? (() => {
        const d = t(`permissions.matrix.pageDesc.${perm.permission_key}`)
        return d === `permissions.matrix.pageDesc.${perm.permission_key}` ? perm.permission_name_ar : d
      })()
    : permissionActionDescription(perm.permission_key, t)

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onToggle}
      className={`flex items-start gap-3 rounded-xl border p-3 text-start transition ${
        allowed
          ? isOverride
            ? 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/15'
            : 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/50'
      } disabled:opacity-60`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
          allowed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600'
        }`}
      >
        {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          {isPage && <Eye className="h-3.5 w-3.5 text-violet-400" />}
          <span className="text-sm font-black text-slate-100">{actionLabel}</span>
          {isOverride && (
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
              {t('permissions.matrix.overrideBadge')}
            </span>
          )}
        </span>
        {isUserMode && roleDefault !== undefined && isOverride && (
          <span className="mt-0.5 block text-[10px] text-slate-500">
            {t('permissions.matrix.roleDefault', {
              value: roleDefault ? t('permissions.allow') : t('permissions.matrix.denied')
            })}
          </span>
        )}
        <span className="mt-0.5 block text-[10px] font-mono text-slate-500" dir="ltr">
          {perm.module_key}.{perm.permission_key}
        </span>
        {actionDesc && <span className="mt-1 block text-xs leading-snug text-slate-400">{actionDesc}</span>}
      </span>
    </button>
  )
}

function MatrixNodeSection({
  node,
  depth,
  permissions,
  rolePerms,
  overrideKeys,
  roleBasePerms,
  isUserMode,
  userSelected,
  expandedNodes,
  busyKey,
  t,
  onToggleExpand,
  onSetPermission,
  onSetPermissions,
  onError
}: {
  node: MatrixTreeNode
  depth: number
  permissions: SystemPermission[]
  rolePerms: Map<string, boolean>
  overrideKeys?: Set<string>
  roleBasePerms?: Map<string, boolean>
  isUserMode: boolean
  userSelected: boolean
  expandedNodes: Set<string>
  busyKey: string | null
  t: (key: string, vars?: Record<string, string | number>) => string
  onToggleExpand: (id: string) => void
  onSetPermission: (permissionId: string, allowed: boolean) => Promise<void>
  onSetPermissions: (permissionIds: string[], allowed: boolean) => Promise<void>
  onError: (message: string) => void
}) {
  const expanded = expandedNodes.has(node.id)
  const nodePerms = permissionsForNode(node, permissions)
  const subtreePerms = collectPermissionsForSubtree(node, permissions)
  const directCounts = countEnabled(nodePerms, rolePerms)
  const subtreeCounts = countEnabled(subtreePerms, rolePerms)
  const hasChildren = (node.children?.length ?? 0) > 0
  const hasDirect = nodePerms.length > 0
  const disabled = isUserMode && !userSelected

  const pagePerms = nodePerms.filter(p => p.module_key === 'pages')
  const actionPerms = nodePerms
    .filter(p => p.module_key !== 'pages')
    .sort(
      (a, b) =>
        sortActionsForMatrix([a.permission_key, b.permission_key]).indexOf(a.permission_key) -
        sortActionsForMatrix([a.permission_key, b.permission_key]).indexOf(b.permission_key)
    )

  async function runBusy(key: string, fn: () => Promise<void>) {
    try {
      await fn()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error')
    }
  }

  const pad = depth === 0 ? '' : depth === 1 ? 'ms-0' : 'ms-2 sm:ms-4'

  return (
    <section className={`${pad} ${depth === 0 ? 'card-industrial overflow-hidden' : 'rounded-xl border border-slate-800 bg-slate-900/30'}`}>
      <button
        type="button"
        onClick={() => onToggleExpand(node.id)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-slate-800/40 ${
          depth === 0 ? 'border-b border-slate-800 bg-slate-900/60' : 'border-b border-slate-800/80'
        }`}
      >
        <div className="min-w-0">
          <h4
            className={`font-black ${depth === 0 ? 'text-sm text-violet-200' : depth === 1 ? 'text-base text-white' : 'text-sm text-slate-200'}`}
          >
            {t(node.labelKey)}
          </h4>
          {node.descKey && <p className="mt-0.5 text-xs text-slate-500">{t(node.descKey)}</p>}
          <p className="mt-0.5 text-[10px] text-slate-600">
            {t('permissions.matrix.groupSummary', {
              enabled: subtreeCounts.enabled,
              total: subtreeCounts.total,
              modules: hasChildren ? (node.children?.length ?? 0) : 1
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">
            {subtreeCounts.enabled}/{subtreeCounts.total}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className={`space-y-4 ${depth === 0 ? 'p-4 sm:p-5' : 'p-3 sm:p-4'}`}>
          {hasDirect && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {pagePerms.length > 0 && actionPerms.length > 0
                    ? t('permissions.matrix.visibilityAndActions')
                    : pagePerms.length > 0
                      ? t('permissions.matrix.pageVisibility')
                      : t('permissions.matrix.actions')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled || busyKey === node.id || subtreeCounts.enabled >= subtreeCounts.total}
                    onClick={() =>
                      void runBusy(node.id, () => onSetPermissions(subtreePerms.map(p => p.id), true))
                    }
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 disabled:opacity-40"
                  >
                    {t('permissions.matrix.allowAll')}
                  </button>
                  <button
                    type="button"
                    disabled={disabled || busyKey === node.id || subtreeCounts.enabled === 0}
                    onClick={() =>
                      void runBusy(node.id, () => onSetPermissions(subtreePerms.map(p => p.id), false))
                    }
                    className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-40"
                  >
                    {t('permissions.matrix.denyAll')}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {[...pagePerms, ...actionPerms].map(perm => {
                  const key = permissionKey(perm.module_key, perm.permission_key)
                  const allowed = rolePerms.get(key) ?? false
                  const isOverride = isUserMode && (overrideKeys?.has(key) ?? false)
                  return (
                    <PermToggleCard
                      key={perm.id}
                      perm={perm}
                      allowed={allowed}
                      isOverride={isOverride}
                      roleDefault={roleBasePerms?.get(key)}
                      isUserMode={isUserMode}
                      disabled={disabled}
                      busy={busyKey === perm.id}
                      t={t}
                      onToggle={() => void runBusy(perm.id, () => onSetPermission(perm.id, !allowed))}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {hasChildren && (
            <div className="space-y-2">
              {nodePerms.length === 0 && (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={disabled || busyKey === node.id}
                    onClick={() =>
                      void runBusy(node.id, () => onSetPermissions(subtreePerms.map(p => p.id), true))
                    }
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 disabled:opacity-40"
                  >
                    {t('permissions.matrix.allowAll')}
                  </button>
                  <button
                    type="button"
                    disabled={disabled || busyKey === node.id}
                    onClick={() =>
                      void runBusy(node.id, () => onSetPermissions(subtreePerms.map(p => p.id), false))
                    }
                    className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300 disabled:opacity-40"
                  >
                    {t('permissions.matrix.denyAll')}
                  </button>
                </div>
              )}
              {(node.children ?? []).map(child => (
                <MatrixNodeSection
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  permissions={permissions}
                  rolePerms={rolePerms}
                  overrideKeys={overrideKeys}
                  roleBasePerms={roleBasePerms}
                  isUserMode={isUserMode}
                  userSelected={userSelected}
                  expandedNodes={expandedNodes}
                  busyKey={busyKey}
                  t={t}
                  onToggleExpand={onToggleExpand}
                  onSetPermission={onSetPermission}
                  onSetPermissions={onSetPermissions}
                  onError={onError}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export function PermissionsMatrixTab({
  mode,
  onModeChange,
  roles,
  users,
  permissions,
  selectedRoleId,
  selectedUserId,
  onSelectRole,
  onSelectUser,
  rolePerms,
  overrideKeys,
  roleBasePerms,
  onSetPermission,
  onSetPermissions,
  onError
}: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const selectedUser = users.find(u => u.id === selectedUserId)
  const isUserMode = mode === 'user'

  const filteredTree = useMemo(
    () => filterMatrixTree(PERMISSIONS_MATRIX_TREE, search, t),
    [search, t]
  )

  const stats = useMemo(() => {
    let enabled = 0
    let total = 0
    for (const p of permissions) {
      total++
      if (rolePerms.get(permissionKey(p.module_key, p.permission_key))) enabled++
    }
    return { enabled, total }
  }, [permissions, rolePerms])

  function toggleExpand(id: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runSetPermission(permissionId: string, allowed: boolean) {
    setBusyKey(permissionId)
    try {
      await onSetPermission(permissionId, allowed)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyKey(null)
    }
  }

  async function runSetPermissions(permissionIds: string[], allowed: boolean) {
    setBusyKey('batch')
    try {
      await onSetPermissions(permissionIds, allowed)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('permissions.matrix.title')}</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">
                {isUserMode ? t('permissions.matrix.hintUser') : t('permissions.matrix.hintRole')}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-center lg:min-w-[10rem]">
            <p className="text-2xl font-black text-violet-200">
              {stats.enabled}
              <span className="text-base text-slate-500"> / {stats.total}</span>
            </p>
            <p className="text-[10px] font-bold uppercase text-violet-300/80">{t('permissions.matrix.enabledCount')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange('role')}
            className={`rounded-xl px-4 py-2 text-xs font-black sm:text-sm ${
              mode === 'role' ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('permissions.matrix.modeRole')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('user')}
            className={`rounded-xl px-4 py-2 text-xs font-black sm:text-sm ${
              mode === 'user' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('permissions.matrix.modeUser')}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {!isUserMode ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-400">{t('permissions.matrix.selectRole')}</span>
              <select className={inputCls()} value={selectedRoleId} onChange={e => onSelectRole(e.target.value)}>
                {roles.filter(r => r.is_active).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.role_name_ar}
                    {r.role_code ? ` (${r.role_code})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-400">{t('permissions.matrix.selectUser')}</span>
              <select className={inputCls()} value={selectedUserId} onChange={e => onSelectUser(e.target.value)}>
                <option value="">—</option>
                {users.filter(u => u.is_active && !u.is_blocked).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('permissions.matrix.searchModule')}</span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className={`${inputCls()} ps-9`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('permissions.matrix.searchPh')}
              />
            </div>
          </label>
        </div>

        {!isUserMode && selectedRole && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
            <p className="font-bold text-white">{selectedRole.role_name_ar}</p>
            <p className="font-mono text-xs text-slate-500" dir="ltr">
              {selectedRole.role_code}
            </p>
          </div>
        )}

        {isUserMode && selectedUser && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3">
            <p className="font-bold text-white">{selectedUser.full_name || selectedUser.email}</p>
            <p className="text-xs text-slate-400" dir="ltr">
              {selectedUser.email}
            </p>
            <p className="mt-1 text-sm text-cyan-200/90">
              {t('permissions.matrix.userRoleHint', {
                role: selectedUser.system_role_name_ar || selectedUser.system_role_code || '—'
              })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t('permissions.matrix.userOverrideHint')}</p>
          </div>
        )}

        {isUserMode && !selectedUserId && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t('permissions.matrix.pickUserFirst')}
          </p>
        )}
      </div>

      {filteredTree.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-500">
          {t('common.noResults')}
        </p>
      ) : (
        filteredTree.map(node => (
          <MatrixNodeSection
            key={node.id}
            node={node}
            depth={0}
            permissions={permissions}
            rolePerms={rolePerms}
            overrideKeys={overrideKeys}
            roleBasePerms={roleBasePerms}
            isUserMode={isUserMode}
            userSelected={Boolean(selectedUserId)}
            expandedNodes={expandedNodes}
            busyKey={busyKey}
            t={t}
            onToggleExpand={toggleExpand}
            onSetPermission={runSetPermission}
            onSetPermissions={runSetPermissions}
            onError={onError}
          />
        ))
      )}
    </div>
  )
}
