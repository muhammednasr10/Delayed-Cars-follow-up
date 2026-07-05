import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { PermissionsPreviewView } from './PermissionsPreviewView'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { ConfirmDialog } from '../ConfirmDialog'
import {
  clearUserPermissionOverrides,
  copyRolePermissions,
  copyUserPermissions,
  permissionKey
} from '../../services/permissionsService'
import type { SystemPermission, SystemRole, UserAccountDetail } from '../../Types/permissions'
import {
  buildPagePermissionTree,
  buildPermissionControlItems,
  itemHasActions,
  type PermissionControlItem,
  type PermissionPageTreeNode,
  type PrimaryControlAction
} from '../../Utils/permissionsControlItems'
import { permissionActionLabel } from '../../Utils/permissionLabels'

export type ItemsPanelMode = 'role' | 'user'

type Props = {
  mode: ItemsPanelMode
  roles: SystemRole[]
  users: UserAccountDetail[]
  permissions: SystemPermission[]
  selectedRoleId: string
  selectedUserId: string
  onSelectRole: (id: string) => void
  onSelectUser: (id: string) => void
  effectivePerms: Map<string, boolean>
  overrideKeys?: Set<string>
  onSetPermission: (permissionId: string, allowed: boolean) => Promise<void>
  onPermissionsChanged?: () => Promise<void>
  onNotify?: (message: string, isError?: boolean) => void
  onError: (message: string) => void
}

function SwitchBtn({
  label,
  icon: Icon,
  allowed,
  isOverride,
  disabled,
  busy,
  onClick
}: {
  label: string
  icon?: typeof Eye
  allowed: boolean
  isOverride: boolean
  disabled: boolean
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
        allowed
          ? isOverride
            ? 'border-cyan-500/45 bg-cyan-500/15 text-cyan-50'
            : 'border-emerald-500/45 bg-emerald-500/15 text-emerald-50'
          : isOverride
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
            : 'border-slate-700 bg-slate-950/70 text-slate-400'
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{label}</span>
      <span
        className={`ms-auto flex h-5 w-5 items-center justify-center rounded-md ${
          allowed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
        }`}
      >
        {allowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
    </button>
  )
}

const PRIMARY_META: Record<PrimaryControlAction, { icon: typeof Plus; labelKey: string }> = {
  create: { icon: Plus, labelKey: 'permissions.control.btnCreate' },
  update: { icon: Pencil, labelKey: 'permissions.control.btnUpdate' },
  delete: { icon: Trash2, labelKey: 'permissions.control.btnDelete' }
}

function permState(
  perm: SystemPermission | null | undefined,
  effectivePerms: Map<string, boolean>,
  overrideKeys?: Set<string>
) {
  if (!perm) return null
  const key = permissionKey(perm.module_key, perm.permission_key)
  return {
    perm,
    allowed: effectivePerms.get(key) ?? false,
    isOverride: overrideKeys?.has(key) ?? false
  }
}

function UnifiedPermissionNode({
  node,
  depth,
  expandedIds,
  onToggleExpand,
  effectivePerms,
  overrideKeys,
  disabled,
  busyId,
  t,
  onToggle
}: {
  node: PermissionPageTreeNode
  depth: number
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  effectivePerms: Map<string, boolean>
  overrideKeys?: Set<string>
  disabled: boolean
  busyId: string | null
  t: (key: string, vars?: Record<string, string | number>) => string
  onToggle: (perm: SystemPermission) => void
}) {
  const { item, children } = node
  const page = permState(item.pagePerm, effectivePerms, overrideKeys)
  const hasActions = itemHasActions(item)
  const hasChildren = children.length > 0
  const canExpand = hasActions || hasChildren
  const expanded = expandedIds.has(item.id)
  const isChild = depth > 0

  const primary = (['create', 'update', 'delete'] as const)
    .map(action => {
      const st = permState(item.primaryActions[action], effectivePerms, overrideKeys)
      return st ? { action, ...st } : null
    })
    .filter(Boolean) as { action: PrimaryControlAction; perm: SystemPermission; allowed: boolean; isOverride: boolean }[]

  const other = item.otherActions
    .map(p => permState(p, effectivePerms, overrideKeys))
    .filter(Boolean) as { perm: SystemPermission; allowed: boolean; isOverride: boolean }[]

  return (
    <div className={isChild ? 'ms-3 border-s border-slate-700/70 ps-3 sm:ms-5' : ''}>
      <article
        className={`overflow-hidden rounded-2xl border ${
          isChild ? 'border-slate-700/60 bg-slate-950/40' : 'border-slate-700/80 bg-slate-900/50'
        }`}
      >
        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-start gap-2">
            {canExpand ? (
              <button
                type="button"
                onClick={() => onToggleExpand(item.id)}
                className="mt-0.5 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-expanded={expanded}
                title={expanded ? t('permissions.control.collapseBranch') : t('permissions.control.expandBranch')}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : (
              <span className="mt-0.5 w-6 shrink-0" />
            )}
            <div className="min-w-0">
              {!isChild && item.parentLabelKey && (
                <p className="text-[10px] font-bold text-slate-500">{t(item.parentLabelKey)}</p>
              )}
              <p className={`font-black text-white ${isChild ? 'text-sm' : 'text-base'}`}>{t(item.labelKey)}</p>
              {item.descKey && <p className="mt-0.5 text-xs text-slate-500">{t(item.descKey)}</p>}
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold">
                {hasChildren && (
                  <span className="text-violet-300/90">
                    {t('permissions.control.branchCount', { n: String(children.length) })}
                  </span>
                )}
                {hasActions && (
                  <span className="text-cyan-300/90">
                    {t('permissions.control.actionsInside', {
                      n: String(primary.length + other.length)
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {page && (
            <SwitchBtn
              label={page.allowed ? t('permissions.control.pageVisible') : t('permissions.control.pageHidden')}
              icon={page.allowed ? Eye : EyeOff}
              allowed={page.allowed}
              isOverride={page.isOverride}
              disabled={disabled}
              busy={busyId === page.perm.id}
              onClick={() => onToggle(page.perm)}
            />
          )}
        </div>

        {canExpand && expanded && (
          <div className="space-y-4 border-t border-slate-800 px-3 py-4 sm:px-4">
            {hasActions && (
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-cyan-300/90">
                  {t('permissions.control.sectionActionsHere')}
                </p>
                {primary.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold text-slate-500">{t('permissions.control.sectionButtons')}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {primary.map(entry => {
                        const meta = PRIMARY_META[entry.action]
                        return (
                          <SwitchBtn
                            key={entry.perm.id}
                            label={t(meta.labelKey)}
                            icon={meta.icon}
                            allowed={entry.allowed}
                            isOverride={entry.isOverride}
                            disabled={disabled}
                            busy={busyId === entry.perm.id}
                            onClick={() => onToggle(entry.perm)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
                {other.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold text-slate-500">{t('permissions.control.sectionOther')}</p>
                    <div className="flex flex-wrap gap-2">
                      {other.map(entry => (
                        <SwitchBtn
                          key={entry.perm.id}
                          label={permissionActionLabel(entry.perm.permission_key, t)}
                          allowed={entry.allowed}
                          isOverride={entry.isOverride}
                          disabled={disabled}
                          busy={busyId === entry.perm.id}
                          onClick={() => onToggle(entry.perm)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasChildren && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-violet-300/90">
                  {t('permissions.control.sectionTabs')}
                </p>
                {children.map(child => (
                  <UnifiedPermissionNode
                    key={child.item.id}
                    node={child}
                    depth={depth + 1}
                    expandedIds={expandedIds}
                    onToggleExpand={onToggleExpand}
                    effectivePerms={effectivePerms}
                    overrideKeys={overrideKeys}
                    disabled={disabled}
                    busyId={busyId}
                    t={t}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

export function PermissionsItemsPanel({
  mode,
  roles,
  users,
  permissions,
  selectedRoleId,
  selectedUserId,
  onSelectRole,
  onSelectUser,
  effectivePerms,
  overrideKeys,
  onSetPermission,
  onPermissionsChanged,
  onNotify,
  onError
}: Props) {
  const { t } = useLang()
  const [userSearch, setUserSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set())
  const [copySourceId, setCopySourceId] = useState('')
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [copyBusy, setCopyBusy] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  const isUserMode = mode === 'user'
  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const selectedUser = users.find(u => u.id === selectedUserId)
  const targetReady = isUserMode ? Boolean(selectedUserId) : Boolean(selectedRoleId)
  const disabled = !targetReady

  const copySources = useMemo(() => {
    if (isUserMode) {
      return users
        .filter(u => u.is_active && !u.is_blocked && u.id !== selectedUserId)
        .map(u => ({
          id: u.id,
          label: `${u.full_name || u.email}${u.system_role_name_ar ? ` · ${u.system_role_name_ar}` : ''}`
        }))
    }
    return roles
      .filter(r => r.is_active && r.id !== selectedRoleId)
      .map(r => ({ id: r.id, label: `${r.role_name_ar}${r.role_code ? ` (${r.role_code})` : ''}` }))
  }, [isUserMode, users, roles, selectedUserId, selectedRoleId])

  const copySourceLabel = copySources.find(s => s.id === copySourceId)?.label ?? ''

  const filteredUsers = useMemo(() => {
    const active = users.filter(u => u.is_active && !u.is_blocked)
    const q = userSearch.trim().toLowerCase()
    if (!q) return active
    return active.filter(u => {
      const hay = [u.full_name, u.email, u.employee_code, u.employee_full_name, u.system_role_name_ar]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [users, userSearch])

  const items = useMemo(() => buildPermissionControlItems(permissions), [permissions])

  const visibleItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return items
    return items.filter(item => {
      const label = t(item.labelKey).toLowerCase()
      const parent = item.parentLabelKey ? t(item.parentLabelKey).toLowerCase() : ''
      const desc = item.descKey ? t(item.descKey).toLowerCase() : ''
      return label.includes(q) || parent.includes(q) || desc.includes(q)
    })
  }, [items, itemSearch, t])

  const pageTree = useMemo(() => {
    const tree = buildPagePermissionTree(permissions)
    const q = itemSearch.trim().toLowerCase()
    if (!q) return tree

    function filterNode(node: PermissionPageTreeNode): PermissionPageTreeNode | null {
      const label = t(node.item.labelKey).toLowerCase()
      const parent = node.item.parentLabelKey ? t(node.item.parentLabelKey).toLowerCase() : ''
      const desc = node.item.descKey ? t(node.item.descKey).toLowerCase() : ''
      const selfMatch = label.includes(q) || parent.includes(q) || desc.includes(q)
      const kids = node.children.map(filterNode).filter((n): n is PermissionPageTreeNode => n != null)
      if (selfMatch || kids.length > 0) {
        return { item: node.item, children: selfMatch ? node.children : kids }
      }
      return null
    }

    return tree.map(filterNode).filter((n): n is PermissionPageTreeNode => n != null)
  }, [permissions, itemSearch, t])

  function togglePageExpand(id: string) {
    setExpandedPageIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function collectExpandableIds(nodes: PermissionPageTreeNode[]): string[] {
    return nodes.flatMap(n => {
      const canExpand = itemHasActions(n.item) || n.children.length > 0
      const nested = collectExpandableIds(n.children)
      return canExpand ? [n.item.id, ...nested] : nested
    })
  }

  useEffect(() => {
    if (itemSearch.trim()) {
      setExpandedPageIds(new Set(collectExpandableIds(pageTree)))
    }
  }, [itemSearch, pageTree])

  async function togglePerm(perm: SystemPermission) {
    const key = permissionKey(perm.module_key, perm.permission_key)
    const allowed = effectivePerms.get(key) ?? false
    setBusyId(perm.id)
    try {
      await onSetPermission(perm.id, !allowed)
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmCopy() {
    if (!copySourceId || !targetReady) return
    setCopyBusy(true)
    try {
      if (isUserMode) {
        const source = users.find(u => u.id === copySourceId)
        const n = await copyUserPermissions(
          copySourceId,
          selectedUserId,
          permissions,
          source?.system_role_id ?? null,
          selectedUser?.system_role_id ?? null
        )
        onNotify?.(t('permissions.copy.userDone', { n: String(n) }))
      } else {
        const n = await copyRolePermissions(copySourceId, selectedRoleId, permissions)
        onNotify?.(t('permissions.copy.roleDone', { n: String(n) }))
      }
      setCopyConfirmOpen(false)
      setCopySourceId('')
      await onPermissionsChanged?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      onError(msg === 'SAME_SOURCE' ? t('permissions.copy.sameSource') : msg)
    } finally {
      setCopyBusy(false)
    }
  }

  async function confirmResetOverrides() {
    if (!isUserMode || !selectedUserId) return
    setResetBusy(true)
    try {
      const n = await clearUserPermissionOverrides(selectedUserId)
      setResetConfirmOpen(false)
      onNotify?.(t('permissions.reset.done', { n: String(n) }))
      await onPermissionsChanged?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setResetBusy(false)
    }
  }

  const overrideCount = overrideKeys?.size ?? 0

  return (
    <div className="space-y-4">
      <div className="card-industrial space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-xl p-3 ${isUserMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-violet-500/15 text-violet-300'}`}
          >
            {isUserMode ? <UserRound className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {isUserMode ? t('permissions.control.titleUser') : t('permissions.control.titleRole')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              {isUserMode ? t('permissions.control.hintUser') : t('permissions.control.hintRole')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isUserMode ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-400">{t('permissions.matrix.searchUser')}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    className={`${inputCls()} ps-9`}
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder={t('permissions.matrix.searchUserPh')}
                  />
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-400">{t('permissions.matrix.selectUser')}</span>
                <select className={inputCls()} value={selectedUserId} onChange={e => onSelectUser(e.target.value)}>
                  <option value="">—</option>
                  {filteredUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                      {u.employee_code ? ` · ${u.employee_code}` : ''}
                      {u.system_role_name_ar ? ` · ${u.system_role_name_ar}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="block space-y-1.5 sm:col-span-1">
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
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('permissions.control.searchItems')}</span>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className={`${inputCls()} ps-9`}
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder={t('permissions.control.searchItemsPh')}
                disabled={disabled}
              />
            </div>
          </label>
        </div>

        {!isUserMode && selectedRole && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
            <p className="font-bold text-white">{selectedRole.role_name_ar}</p>
            <p className="font-mono text-xs text-slate-500" dir="ltr">
              {selectedRole.role_code}
            </p>
          </div>
        )}

        {isUserMode && selectedUser && (
          <div className="flex flex-col gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-white">{selectedUser.full_name || selectedUser.email}</p>
              <p className="text-xs text-slate-400" dir="ltr">
                {selectedUser.email}
              </p>
              <p className="mt-1 text-sm text-cyan-200/90">
                {t('permissions.matrix.userRoleHint', {
                  role: selectedUser.system_role_name_ar || selectedUser.system_role_code || '—'
                })}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t('permissions.reset.overrideCount', { n: String(overrideCount) })}
              </p>
            </div>
            <button
              type="button"
              disabled={overrideCount === 0 || resetBusy}
              onClick={() => setResetConfirmOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-black text-amber-100 hover:bg-amber-500/20 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              {t('permissions.reset.btn')}
            </button>
          </div>
        )}

        {isUserMode && !selectedUserId && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t('permissions.control.pickUserFirst')}
          </p>
        )}

        {targetReady && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
                viewMode === 'edit'
                  ? 'bg-violet-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Pencil className="h-4 w-4" />
              {t('permissions.preview.modeEdit')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
                viewMode === 'preview'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="h-4 w-4" />
              {t('permissions.preview.modePreview')}
            </button>
          </div>
        )}

        {targetReady && viewMode === 'edit' && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 sm:p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              {t('permissions.copy.title')}
            </p>
            <p className="mb-3 text-xs text-slate-500">
              {isUserMode ? t('permissions.copy.hintUser') : t('permissions.copy.hintRole')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="text-xs font-bold text-slate-400">
                  {isUserMode ? t('permissions.copy.fromUser') : t('permissions.copy.fromRole')}
                </span>
                <select
                  className={inputCls()}
                  value={copySourceId}
                  onChange={e => setCopySourceId(e.target.value)}
                >
                  <option value="">—</option>
                  {copySources.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!copySourceId || copyBusy}
                onClick={() => setCopyConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                {t('permissions.copy.btn')}
              </button>
            </div>
          </div>
        )}

        {viewMode === 'edit' && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
              {t('permissions.control.legendOn')}
            </span>
            <span className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-slate-300">
              {t('permissions.control.legendOff')}
            </span>
            {isUserMode && (
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                {t('permissions.control.legendOverride')}
              </span>
            )}
          </div>
        )}
      </div>

      {targetReady && viewMode === 'preview' && (
        <PermissionsPreviewView
          items={visibleItems}
          effectivePerms={effectivePerms}
          subjectLabel={
            isUserMode
              ? selectedUser?.full_name || selectedUser?.email || ''
              : selectedRole?.role_name_ar || ''
          }
        />
      )}

      {targetReady && viewMode === 'edit' && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <h4 className="text-sm font-black text-violet-200">{t('permissions.control.unifiedHeading')}</h4>
              <p className="text-xs text-slate-500">{t('permissions.control.unifiedHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExpandedPageIds(new Set(collectExpandableIds(pageTree)))}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
              >
                {t('permissions.matrix.expandAll')}
              </button>
              <button
                type="button"
                onClick={() => setExpandedPageIds(new Set())}
                className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
              >
                {t('permissions.matrix.collapseAll')}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {pageTree.map(node => (
              <UnifiedPermissionNode
                key={node.item.id}
                node={node}
                depth={0}
                expandedIds={expandedPageIds}
                onToggleExpand={togglePageExpand}
                effectivePerms={effectivePerms}
                overrideKeys={overrideKeys}
                disabled={disabled}
                busyId={busyId}
                t={t}
                onToggle={perm => void togglePerm(perm)}
              />
            ))}
            {pageTree.length === 0 && (
              <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-500">
                {t('common.noResults')}
              </p>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={copyConfirmOpen}
        title={t('permissions.copy.confirmTitle')}
        message={
          isUserMode
            ? t('permissions.copy.confirmUser', {
                source: copySourceLabel,
                target: selectedUser?.full_name || selectedUser?.email || ''
              })
            : t('permissions.copy.confirmRole', {
                source: copySourceLabel,
                target: selectedRole?.role_name_ar || ''
              })
        }
        confirmLabel={t('permissions.copy.btn')}
        tone="default"
        busy={copyBusy}
        onCancel={() => setCopyConfirmOpen(false)}
        onConfirm={() => void confirmCopy()}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title={t('permissions.reset.confirmTitle')}
        message={t('permissions.reset.confirmMsg', {
          user: selectedUser?.full_name || selectedUser?.email || '',
          n: String(overrideCount)
        })}
        confirmLabel={t('permissions.reset.btn')}
        busy={resetBusy}
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => void confirmResetOverrides()}
      />
    </div>
  )
}
