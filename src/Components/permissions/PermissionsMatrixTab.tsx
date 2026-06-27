import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Search, Shield, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { permissionKey } from '../../services/permissionsService'
import type { SystemPermission, SystemRole } from '../../Types/permissions'
import {
  formatPermissionLabel,
  groupModulesForMatrix,
  permissionActionDescription,
  permissionActionLabel,
  permissionModuleDescription,
  permissionModuleLabel,
  sortActionsForMatrix
} from '../../Utils/permissionLabels'

type Props = {
  roles: SystemRole[]
  permissions: SystemPermission[]
  selectedRoleId: string
  onSelectRole: (id: string) => void
  rolePerms: Map<string, boolean>
  onSetPermission: (permissionId: string, allowed: boolean) => Promise<void>
  onSetModulePermissions: (moduleKey: string, allowed: boolean) => Promise<void>
  onError: (message: string) => void
}

export function PermissionsMatrixTab({
  roles,
  permissions,
  selectedRoleId,
  onSelectRole,
  rolePerms,
  onSetPermission,
  onSetModulePermissions,
  onError
}: Props) {
  const { t, lang } = useLang()
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const selectedRole = roles.find(r => r.id === selectedRoleId)
  const locale = lang === 'ar' ? 'ar' : 'en'

  const permsByModule = useMemo(() => {
    const map = new Map<string, SystemPermission[]>()
    for (const p of permissions) {
      const list = map.get(p.module_key) ?? []
      list.push(p)
      map.set(p.module_key, list)
    }
    for (const [key, list] of map) {
      map.set(
        key,
        list.sort((a, b) =>
          sortActionsForMatrix([a.permission_key, b.permission_key]).indexOf(a.permission_key) -
          sortActionsForMatrix([a.permission_key, b.permission_key]).indexOf(b.permission_key)
        )
      )
    }
    return map
  }, [permissions])

  const allModuleKeys = useMemo(() => [...permsByModule.keys()], [permsByModule])

  const groupedModules = useMemo(
    () => groupModulesForMatrix(allModuleKeys, t, locale),
    [allModuleKeys, t, locale]
  )

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return groupedModules
    return groupedModules
      .map(g => ({
        ...g,
        modules: g.modules.filter(mod => {
          const label = permissionModuleLabel(mod, t).toLowerCase()
          const desc = permissionModuleDescription(mod, t).toLowerCase()
          const perms = permsByModule.get(mod) ?? []
          const permText = perms
            .map(p => formatPermissionLabel(p.module_key, p.permission_key, t).toLowerCase())
            .join(' ')
          return label.includes(term) || desc.includes(term) || permText.includes(term) || mod.includes(term)
        })
      }))
      .filter(g => g.modules.length > 0)
  }, [groupedModules, search, t, permsByModule])

  const stats = useMemo(() => {
    let enabled = 0
    let total = 0
    for (const p of permissions) {
      total++
      if (rolePerms.get(permissionKey(p.module_key, p.permission_key))) enabled++
    }
    return { enabled, total }
  }, [permissions, rolePerms])

  function toggleGroup(groupKey: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  async function runBusy(key: string, fn: () => Promise<void>) {
    setBusyKey(key)
    try {
      await fn()
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
              <p className="mt-1 max-w-2xl text-sm text-slate-400">{t('permissions.matrix.hint')}</p>
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

        <div className="grid gap-3 sm:grid-cols-2">
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

        {selectedRole && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
            <p className="font-bold text-white">{selectedRole.role_name_ar}</p>
            <p className="font-mono text-xs text-slate-500" dir="ltr">
              {selectedRole.role_code}
            </p>
            {selectedRole.description && <p className="mt-1 text-sm text-slate-400">{selectedRole.description}</p>}
          </div>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-500">
          {t('common.noResults')}
        </p>
      ) : (
        filteredGroups.map(group => {
          const collapsed = collapsedGroups.has(group.groupKey)
          const groupEnabled = group.modules.reduce((n, mod) => {
            const perms = permsByModule.get(mod) ?? []
            return n + perms.filter(p => rolePerms.get(permissionKey(p.module_key, p.permission_key))).length
          }, 0)
          const groupTotal = group.modules.reduce((n, mod) => n + (permsByModule.get(mod)?.length ?? 0), 0)

          return (
            <section key={group.groupKey} className="card-industrial overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.groupKey)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3 text-start hover:bg-slate-800/40"
              >
                <div>
                  <h4 className="text-sm font-black text-violet-200">{group.groupLabel}</h4>
                  <p className="text-xs text-slate-500">
                    {t('permissions.matrix.groupSummary', { enabled: groupEnabled, total: groupTotal, modules: group.modules.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">
                    {groupEnabled}/{groupTotal}
                  </span>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
                </div>
              </button>

              {!collapsed && (
                <div className="divide-y divide-slate-800">
                  {group.modules.map(mod => {
                    const modPerms = permsByModule.get(mod) ?? []
                    const modEnabled = modPerms.filter(p =>
                      rolePerms.get(permissionKey(p.module_key, p.permission_key))
                    ).length
                    const modBusy = busyKey === mod

                    return (
                      <div key={mod} className="p-4 sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="text-base font-black text-white">{permissionModuleLabel(mod, t)}</h5>
                              <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-500" dir="ltr">
                                {mod}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  modEnabled === modPerms.length
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : modEnabled === 0
                                      ? 'bg-slate-800 text-slate-500'
                                      : 'bg-amber-500/15 text-amber-300'
                                }`}
                              >
                                {t('permissions.matrix.moduleCount', { enabled: modEnabled, total: modPerms.length })}
                              </span>
                            </div>
                            {permissionModuleDescription(mod, t) && (
                              <p className="mt-1 text-sm text-slate-400">{permissionModuleDescription(mod, t)}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={modBusy || modEnabled === modPerms.length}
                              onClick={() => void runBusy(mod, () => onSetModulePermissions(mod, true))}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 disabled:opacity-40"
                            >
                              {t('permissions.matrix.allowAll')}
                            </button>
                            <button
                              type="button"
                              disabled={modBusy || modEnabled === 0}
                              onClick={() => void runBusy(mod, () => onSetModulePermissions(mod, false))}
                              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 disabled:opacity-40"
                            >
                              {t('permissions.matrix.denyAll')}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {modPerms.map(perm => {
                            const key = permissionKey(perm.module_key, perm.permission_key)
                            const allowed = rolePerms.get(key) ?? false
                            const actionDesc =
                              perm.module_key === 'pages'
                                ? (() => {
                                    const d = t(`permissions.matrix.pageDesc.${perm.permission_key}`)
                                    return d === `permissions.matrix.pageDesc.${perm.permission_key}` ? '' : d
                                  })()
                                : permissionActionDescription(perm.permission_key, t)
                            const actionLabel =
                              perm.module_key === 'pages'
                                ? perm.permission_name_ar || perm.permission_key
                                : permissionActionLabel(perm.permission_key, t)
                            const toggleBusy = busyKey === perm.id

                            return (
                              <button
                                key={perm.id}
                                type="button"
                                disabled={toggleBusy}
                                onClick={() =>
                                  void runBusy(perm.id, () => onSetPermission(perm.id, !allowed))
                                }
                                className={`flex items-start gap-3 rounded-xl border p-3 text-start transition ${
                                  allowed
                                    ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
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
                                  <span className="block text-sm font-black text-slate-100">
                                    {actionLabel}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] font-mono text-slate-500" dir="ltr">
                                    {perm.permission_key}
                                  </span>
                                  {actionDesc && actionDesc !== `permissions.matrix.pageDesc.${perm.permission_key}` && (
                                    <span className="mt-1 block text-xs leading-snug text-slate-400">{actionDesc}</span>
                                  )}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
