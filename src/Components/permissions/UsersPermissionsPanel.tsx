import { useEffect, useMemo, useState } from 'react'
import { Shield, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import {
  getRolePermissions,
  getSystemPermissions,
  getSystemRoles,
  permissionKey,
  setRolePermission,
  setUserPermissionOverride
} from '../../services/permissionsService'
import {
  blockUser,
  getUserAccounts,
  linkUserToEmployee,
  unblockUser
} from '../../services/userAccountsService'
import { getEmployees } from '../../services/employeesService'
import type { UserAccountDetail } from '../../Types/permissions'
import type { Employee } from '../../Types/employee'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'

type SubTab = 'users' | 'roles' | 'matrix' | 'overrides' | 'blocked'

const MATRIX_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'import', 'export', 'manage'] as const

export function UsersPermissionsPanel({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t } = useLang()
  const { hasPermission, reload: reloadPerms } = usePermissions()
  const canManage = hasPermission('users', 'manage')

  const [subTab, setSubTab] = useState<SubTab>('users')
  const [users, setUsers] = useState<UserAccountDetail[]>([])
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof getSystemRoles>>>([])
  const [permissions, setPermissions] = useState<Awaited<ReturnType<typeof getSystemPermissions>>>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [rolePerms, setRolePerms] = useState<Map<string, boolean>>(new Map())
  const [linkModal, setLinkModal] = useState<UserAccountDetail | null>(null)
  const [blockModal, setBlockModal] = useState<UserAccountDetail | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [linkEmployeeId, setLinkEmployeeId] = useState('')
  const [linkRoleId, setLinkRoleId] = useState('')
  const [overrideUserId, setOverrideUserId] = useState('')
  const [overridePermId, setOverridePermId] = useState('')
  const [overrideAllowed, setOverrideAllowed] = useState(true)
  const [overrideReason, setOverrideReason] = useState('')
  const [busy, setBusy] = useState(false)

  const modules = useMemo(() => [...new Set(permissions.map(p => p.module_key))].sort(), [permissions])

  async function reload() {
    setLoading(true)
    try {
      const [u, r, p, e] = await Promise.all([getUserAccounts(), getSystemRoles(), getSystemPermissions(), getEmployees()])
      setUsers(u)
      setRoles(r)
      setPermissions(p)
      setEmployees(e)
      if (!selectedRoleId && r[0]) setSelectedRoleId(r[0].id)
    } catch (err) {
      notify(err instanceof Error ? err.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!selectedRoleId) return
    getRolePermissions(selectedRoleId).then(setRolePerms).catch(() => setRolePerms(new Map()))
  }, [selectedRoleId])

  function userStatus(u: UserAccountDetail): { label: string; cls: string } {
    if (u.is_blocked) return { label: t('permissions.statusBlocked'), cls: 'text-red-300' }
    if (!u.is_active) return { label: t('permissions.statusInactive'), cls: 'text-slate-400' }
    if (!u.employee_id) return { label: t('permissions.statusUnlinked'), cls: 'text-amber-300' }
    if (u.employment_status && u.employment_status !== 'active')
      return { label: t('permissions.statusEmployeeStopped'), cls: 'text-orange-300' }
    return { label: t('permissions.statusActive'), cls: 'text-emerald-300' }
  }

  async function saveLink() {
    if (!linkModal) return
    setBusy(true)
    try {
      await linkUserToEmployee(linkModal.id, linkEmployeeId || null, linkRoleId || linkModal.system_role_id)
      await reload()
      setLinkModal(null)
      notify(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function confirmBlock() {
    if (!blockModal || !blockReason.trim()) return
    setBusy(true)
    try {
      await blockUser(blockModal.id, blockReason.trim())
      await reload()
      setBlockModal(null)
      setBlockReason('')
      notify(t('permissions.userBlocked'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'users', label: t('permissions.tabs.users') },
    { key: 'roles', label: t('permissions.tabs.roles') },
    { key: 'matrix', label: t('permissions.tabs.matrix') },
    { key: 'overrides', label: t('permissions.tabs.overrides') },
    { key: 'blocked', label: t('permissions.tabs.blocked') }
  ]

  if (!canManage) {
    return <div className="card-industrial p-6 text-amber-300">{t('training.noPerm')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map(st => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSubTab(st.key)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${subTab === st.key ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : subTab === 'users' ? (
        <div className="card-industrial overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
                <th className="table-cell">{t('permissions.userEmail')}</th>
                <th className="table-cell">{t('permissions.linkedEmployee')}</th>
                <th className="table-cell">{t('permissions.jobRole')}</th>
                <th className="table-cell">{t('permissions.systemRole')}</th>
                <th className="table-cell">{t('permissions.status')}</th>
                <th className="table-cell">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const st = userStatus(u)
                return (
                  <tr key={u.id} className="border-b border-slate-800/80">
                    <td className="table-cell">{u.email}</td>
                    <td className="table-cell">
                      {u.employee_full_name ? `${u.employee_code} — ${u.employee_full_name}` : '—'}
                    </td>
                    <td className="table-cell">{u.job_role ? t(`jobRole.${u.job_role}`) : '—'}</td>
                    <td className="table-cell">{u.system_role_name_ar || '—'}</td>
                    <td className={`table-cell font-bold ${st.cls}`}>{st.label}</td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="text-xs text-cyan-400" onClick={() => { setLinkModal(u); setLinkEmployeeId(u.employee_id ?? ''); setLinkRoleId(u.system_role_id ?? '') }}>
                          {t('permissions.link')}
                        </button>
                        {!u.is_blocked ? (
                          <button type="button" className="text-xs text-red-400" onClick={() => setBlockModal(u)}>
                            {t('permissions.blockUser')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-emerald-400"
                            onClick={() => void unblockUser(u.id).then(() => reload().then(() => notify(t('permissions.userUnblocked'))))}
                          >
                            {t('permissions.unblockUser')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : subTab === 'roles' ? (
        <div className="card-industrial p-4">
          <ul className="space-y-2">
            {roles.map(r => (
              <li key={r.id} className="flex justify-between rounded-lg border border-slate-800 px-3 py-2">
                <span className="font-bold text-white">{r.role_name_ar}</span>
                <span className="font-mono text-xs text-slate-500" dir="ltr">
                  {r.role_code}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : subTab === 'matrix' ? (
        <div className="space-y-3">
          <select className={inputCls()} value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}>
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.role_name_ar}
              </option>
            ))}
          </select>
          <div className="card-industrial max-h-[480px] overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="p-2 text-start">{t('permissions.module')}</th>
                  {MATRIX_ACTIONS.map(a => (
                    <th key={a} className="p-2">
                      {t(`permissions.action.${a}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => (
                  <tr key={mod} className="border-t border-slate-800">
                    <td className="p-2 font-bold text-slate-300">{mod}</td>
                    {MATRIX_ACTIONS.map(action => {
                      const perm = permissions.find(p => p.module_key === mod && p.permission_key === action)
                      if (!perm)
                        return (
                          <td key={action} className="p-2 text-center text-slate-700">
                            —
                          </td>
                        )
                      const key = permissionKey(mod, action)
                      const checked = rolePerms.get(key) ?? false
                      return (
                        <td key={action} className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e =>
                              void setRolePermission(selectedRoleId, perm.id, e.target.checked).then(() =>
                                getRolePermissions(selectedRoleId).then(setRolePerms)
                              )
                            }
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'overrides' ? (
        <div className="card-industrial grid gap-3 p-4 sm:grid-cols-2">
          <Field label={t('permissions.user')}>
            <select className={inputCls()} value={overrideUserId} onChange={e => setOverrideUserId(e.target.value)}>
              <option value="">—</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('permissions.permission')}>
            <select className={inputCls()} value={overridePermId} onChange={e => setOverridePermId(e.target.value)}>
              <option value="">—</option>
              {permissions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.module_key}.{p.permission_key}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={overrideAllowed} onChange={e => setOverrideAllowed(e.target.checked)} />
            {t('permissions.allow')}
          </label>
          <Field label={t('permissions.reason')}>
            <input className={inputCls()} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
          </Field>
          <button
            type="button"
            disabled={!overrideUserId || !overridePermId}
            className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 disabled:opacity-40 sm:col-span-2"
            onClick={() =>
              void setUserPermissionOverride(overrideUserId, overridePermId, overrideAllowed, overrideReason).then(() => {
                notify(t('settings.updated'))
                void reloadPerms()
              })
            }
          >
            {t('permissions.savePermissions')}
          </button>
        </div>
      ) : (
        <div className="card-industrial p-4">
          <ul className="space-y-2">
            {users.filter(u => u.is_blocked).map(u => (
              <li key={u.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
                <p className="font-bold text-white">{u.email}</p>
                <p className="text-red-200">{u.blocked_reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={Boolean(linkModal)}
        title={t('permissions.linkUserEmployee')}
        icon={<Users className="h-5 w-5" />}
        onClose={() => setLinkModal(null)}
        footer={
          <>
            <button onClick={() => setLinkModal(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
              {t('common.cancel')}
            </button>
            <button disabled={busy} onClick={() => void saveLink()} className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950">
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('permissions.employee')}>
            <select className={inputCls()} value={linkEmployeeId} onChange={e => setLinkEmployeeId(e.target.value)}>
              <option value="">{t('permissions.noEmployee')}</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.employeeCode} — {e.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('permissions.systemRole')}>
            <select className={inputCls()} value={linkRoleId} onChange={e => setLinkRoleId(e.target.value)}>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.role_name_ar}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(blockModal)}
        title={t('permissions.blockUser')}
        icon={<Shield className="h-5 w-5" />}
        onClose={() => setBlockModal(null)}
        footer={
          <>
            <button onClick={() => setBlockModal(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
              {t('common.cancel')}
            </button>
            <button disabled={busy || !blockReason.trim()} onClick={() => void confirmBlock()} className="rounded-xl bg-red-500 px-4 py-2 font-black text-white">
              {t('common.confirm')}
            </button>
          </>
        }
      >
        <Field label={t('permissions.blockReason')} required>
          <textarea className={inputCls()} rows={3} value={blockReason} onChange={e => setBlockReason(e.target.value)} />
        </Field>
      </Modal>
    </div>
  )
}
