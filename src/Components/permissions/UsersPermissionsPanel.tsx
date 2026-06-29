import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Pencil, Plus, Shield, Trash2, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import {
  deleteSystemRole,
  getAllSystemRoles,
  getRolePermissions,
  getSystemPermissions,
  getUserEffectivePermissions,
  permissionKey,
  setRolePermission,
  setUserPermissionOverride
} from '../../services/permissionsService'
import {
  blockUser,
  deactivateUserAccount,
  getUserAccounts,
  removeUserPermissionOverride,
  unblockUser
} from '../../services/userAccountsService'
import { countOpenUserSupportRequests } from '../../services/userRequestsService'
import { getEmployees } from '../../services/employeesService'
import type { UserAccountDetail } from '../../Types/permissions'
import type { SystemRole } from '../../Types/permissions'
import type { Employee } from '../../Types/employee'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { Field, inputCls } from '../FormField'
import { UserAccountFormModal } from './UserAccountFormModal'
import { ExportableTable } from '../ExportableTable'
import { UserRequestsTab } from './UserRequestsTab'
import { UserPasswordModal } from './UserPasswordModal'
import { SystemRoleFormModal } from './SystemRoleFormModal'
import { PermissionsMatrixTab } from './PermissionsMatrixTab'
import { ActiveUsersTab } from './ActiveUsersTab'

type SubTab = 'users' | 'roles' | 'matrix' | 'activeUsers' | 'blocked' | 'requests'

export function UsersPermissionsPanel({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t, lang } = useLang()
  const { hasPermission, reload: reloadPerms } = usePermissions()
  const canManage = hasPermission('users', 'manage')

  const [subTab, setSubTab] = useState<SubTab>('users')
  const [users, setUsers] = useState<UserAccountDetail[]>([])
  const [roles, setRoles] = useState<SystemRole[]>([])
  const [permissions, setPermissions] = useState<Awaited<ReturnType<typeof getSystemPermissions>>>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [matrixMode, setMatrixMode] = useState<'role' | 'user'>('role')
  const [selectedMatrixUserId, setSelectedMatrixUserId] = useState('')
  const [rolePerms, setRolePerms] = useState<Map<string, boolean>>(new Map())
  const [userMatrixPerms, setUserMatrixPerms] = useState<Map<string, boolean>>(new Map())
  const [userRoleBasePerms, setUserRoleBasePerms] = useState<Map<string, boolean>>(new Map())
  const [userOverrideKeys, setUserOverrideKeys] = useState<Set<string>>(new Set())
  const [userForm, setUserForm] = useState<{ mode: 'create' | 'edit'; user: UserAccountDetail | null } | null>(null)
  const [roleForm, setRoleForm] = useState<SystemRole | null | 'new'>(null)
  const [deleteUser, setDeleteUser] = useState<UserAccountDetail | null>(null)
  const [deleteRole, setDeleteRole] = useState<SystemRole | null>(null)
  const [passwordUser, setPasswordUser] = useState<UserAccountDetail | null>(null)
  const [blockModal, setBlockModal] = useState<UserAccountDetail | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [openRequestCount, setOpenRequestCount] = useState(0)

  async function refreshRolePerms() {
    if (!selectedRoleId) return
    const next = await getRolePermissions(selectedRoleId)
    setRolePerms(next)
  }

  async function refreshUserMatrixPerms() {
    if (!selectedMatrixUserId) {
      setUserMatrixPerms(new Map())
      setUserRoleBasePerms(new Map())
      setUserOverrideKeys(new Set())
      return
    }
    const user = users.find(u => u.id === selectedMatrixUserId)
    const state = await getUserEffectivePermissions(permissions, selectedMatrixUserId, user?.system_role_id ?? null)
    setUserMatrixPerms(state.effective)
    setUserRoleBasePerms(state.roleBase)
    setUserOverrideKeys(state.overrideKeys)
  }

  async function handleSetPermission(permissionId: string, allowed: boolean) {
    if (matrixMode === 'user') {
      await handleSetUserMatrixPermission(permissionId, allowed)
      return
    }
    const perm = permissions.find(p => p.id === permissionId)
    if (perm) {
      const key = permissionKey(perm.module_key, perm.permission_key)
      setRolePerms(prev => new Map(prev).set(key, allowed))
    }
    try {
      await setRolePermission(selectedRoleId, permissionId, allowed)
      await refreshRolePerms()
    } catch (e) {
      await refreshRolePerms()
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    }
  }

  async function handleSetUserMatrixPermission(permissionId: string, allowed: boolean) {
    if (!selectedMatrixUserId) return
    const perm = permissions.find(p => p.id === permissionId)
    if (!perm) return
    const key = permissionKey(perm.module_key, perm.permission_key)
    const roleDefault = userRoleBasePerms.get(key) ?? false

    setUserMatrixPerms(prev => new Map(prev).set(key, allowed))
    setUserOverrideKeys(prev => {
      const next = new Set(prev)
      if (allowed === roleDefault) next.delete(key)
      else next.add(key)
      return next
    })

    try {
      if (allowed === roleDefault) {
        await removeUserPermissionOverride(selectedMatrixUserId, permissionId)
      } else {
        await setUserPermissionOverride(selectedMatrixUserId, permissionId, allowed)
      }
      await refreshUserMatrixPerms()
      await reloadPerms()
    } catch (e) {
      await refreshUserMatrixPerms()
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    }
  }

  async function handleSetPermissions(permissionIds: string[], allowed: boolean) {
    if (!permissionIds.length) return
    if (matrixMode === 'user') {
      if (!selectedMatrixUserId) return
      setUserMatrixPerms(prev => {
        const next = new Map(prev)
        for (const id of permissionIds) {
          const perm = permissions.find(p => p.id === id)
          if (!perm) continue
          next.set(permissionKey(perm.module_key, perm.permission_key), allowed)
        }
        return next
      })
      try {
        for (const id of permissionIds) {
          const perm = permissions.find(p => p.id === id)
          if (!perm) continue
          const key = permissionKey(perm.module_key, perm.permission_key)
          const roleDefault = userRoleBasePerms.get(key) ?? false
          if (allowed === roleDefault) await removeUserPermissionOverride(selectedMatrixUserId, id)
          else await setUserPermissionOverride(selectedMatrixUserId, id, allowed)
        }
        await refreshUserMatrixPerms()
        await reloadPerms()
      } catch (e) {
        await refreshUserMatrixPerms()
        notify(e instanceof Error ? e.message : t('common.error'), true)
        throw e
      }
      return
    }
    setRolePerms(prev => {
      const next = new Map(prev)
      for (const id of permissionIds) {
        const perm = permissions.find(p => p.id === id)
        if (!perm) continue
        next.set(permissionKey(perm.module_key, perm.permission_key), allowed)
      }
      return next
    })
    try {
      await Promise.all(permissionIds.map(id => setRolePermission(selectedRoleId, id, allowed)))
      await refreshRolePerms()
    } catch (e) {
      await refreshRolePerms()
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    }
  }

  async function handleSetModulePermissions(moduleKey: string, allowed: boolean) {
    if (matrixMode === 'user') {
      if (!selectedMatrixUserId) return
      const modPerms = permissions.filter(p => p.module_key === moduleKey)
      setUserMatrixPerms(prev => {
        const next = new Map(prev)
        for (const p of modPerms) {
          next.set(permissionKey(p.module_key, p.permission_key), allowed)
        }
        return next
      })
      try {
        for (const p of modPerms) {
          const key = permissionKey(p.module_key, p.permission_key)
          const roleDefault = userRoleBasePerms.get(key) ?? false
          if (allowed === roleDefault) {
            await removeUserPermissionOverride(selectedMatrixUserId, p.id)
          } else {
            await setUserPermissionOverride(selectedMatrixUserId, p.id, allowed)
          }
        }
        await refreshUserMatrixPerms()
        await reloadPerms()
      } catch (e) {
        await refreshUserMatrixPerms()
        notify(e instanceof Error ? e.message : t('common.error'), true)
        throw e
      }
      return
    }
    const modPerms = permissions.filter(p => p.module_key === moduleKey)
    setRolePerms(prev => {
      const next = new Map(prev)
      for (const p of modPerms) {
        next.set(permissionKey(p.module_key, p.permission_key), allowed)
      }
      return next
    })
    try {
      await Promise.all(modPerms.map(p => setRolePermission(selectedRoleId, p.id, allowed)))
      await refreshRolePerms()
    } catch (e) {
      await refreshRolePerms()
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    }
  }

  async function reloadOpenRequestCount() {
    try {
      const n = await countOpenUserSupportRequests()
      setOpenRequestCount(n)
    } catch {
      setOpenRequestCount(0)
    }
  }

  async function reload() {
    setLoading(true)
    try {
      const [u, r, p, e] = await Promise.all([
        getUserAccounts(),
        getAllSystemRoles(true),
        getSystemPermissions(),
        getEmployees()
      ])
      setUsers(u)
      setRoles(r)
      setPermissions(p)
      setEmployees(e)
      if (!selectedRoleId && r[0]) setSelectedRoleId(r[0].id)
      await reloadOpenRequestCount()
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

  useEffect(() => {
    if (matrixMode !== 'user' || !selectedMatrixUserId || permissions.length === 0) return
    void refreshUserMatrixPerms().catch(() => {
      setUserMatrixPerms(new Map())
      setUserRoleBasePerms(new Map())
      setUserOverrideKeys(new Set())
    })
  }, [matrixMode, selectedMatrixUserId, permissions, users])

  function userStatus(u: UserAccountDetail): { label: string; cls: string } {
    if (u.is_blocked) return { label: t('permissions.statusBlocked'), cls: 'text-red-300' }
    if (!u.is_active) return { label: t('permissions.statusInactive'), cls: 'text-slate-400' }
    if (!u.employee_id) return { label: t('permissions.statusUnlinked'), cls: 'text-amber-300' }
    if (u.employment_status && u.employment_status !== 'active')
      return { label: t('permissions.statusEmployeeStopped'), cls: 'text-orange-300' }
    return { label: t('permissions.statusActive'), cls: 'text-emerald-300' }
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

  async function confirmDeactivateUser() {
    if (!deleteUser) return
    setBusy(true)
    try {
      await deactivateUserAccount(deleteUser.id)
      await reload()
      setDeleteUser(null)
      notify(t('permissions.userDeactivated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteRole() {
    if (!deleteRole) return
    setBusy(true)
    try {
      await deleteSystemRole(deleteRole.id)
      await reload()
      setDeleteRole(null)
      notify(t('settings.deleted'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const subTabs: { key: SubTab; label: string; badge?: number }[] = [
    { key: 'users', label: t('permissions.tabs.users') },
    { key: 'requests', label: t('permissions.tabs.requests'), badge: openRequestCount },
    { key: 'roles', label: t('permissions.tabs.roles') },
    { key: 'matrix', label: t('permissions.tabs.matrix') },
    { key: 'activeUsers', label: t('permissions.tabs.activeUsers') },
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
            {st.badge ? (
              <span className="ms-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{st.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">{t('common.loading')}</p>
      ) : subTab === 'users' ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setUserForm({ mode: 'create', user: null })}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950"
            >
              <Plus className="h-4 w-4" />
              {t('permissions.addUser')}
            </button>
          </div>
          <div className="card-industrial overflow-hidden">
            <ExportableTable filename="users" title={t('permissions.tabs.users')} rowCount={users.length}>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
                  <th className="table-cell">{t('permissions.userEmail')}</th>
                  <th className="table-cell">{t('permissions.linkedEmployee')}</th>
                  <th className="table-cell">{t('permissions.jobRole')}</th>
                  <th className="table-cell">{t('permissions.systemRole')}</th>
                  <th className="table-cell">{t('permissions.status')}</th>
                  <th data-export-skip className="table-cell">{t('common.actions')}</th>
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
                      <td data-export-skip className="table-cell">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            title={t('common.edit')}
                            className="rounded-lg p-1.5 text-cyan-400 hover:bg-slate-800"
                            onClick={() => setUserForm({ mode: 'edit', user: u })}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t('permissions.managePassword')}
                            className="rounded-lg p-1.5 text-amber-300 hover:bg-slate-800"
                            onClick={() => setPasswordUser(u)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {u.is_active && (
                            <button
                              type="button"
                              title={t('common.delete')}
                              className="rounded-lg p-1.5 text-red-400 hover:bg-slate-800"
                              onClick={() => setDeleteUser(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {!u.is_blocked ? (
                            <button type="button" className="text-xs text-red-400" onClick={() => setBlockModal(u)}>
                              {t('permissions.blockUser')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-emerald-400"
                              onClick={() =>
                                void unblockUser(u.id).then(() => reload().then(() => notify(t('permissions.userUnblocked'))))
                              }
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
            </ExportableTable>
          </div>
        </>
      ) : subTab === 'requests' ? (
        <UserRequestsTab
          users={users}
          notify={notify}
          onChanged={() => void reloadOpenRequestCount()}
        />
      ) : subTab === 'roles' ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRoleForm('new')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950"
            >
              <Plus className="h-4 w-4" />
              {t('permissions.addRole')}
            </button>
          </div>
          <div className="card-industrial p-4">
            <ul className="space-y-2">
              {roles.map(r => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2">
                  <div>
                    <span className="font-bold text-white">{r.role_name_ar}</span>
                    {!r.is_active && <span className="ms-2 text-xs text-slate-500">({t('permissions.inactive')})</span>}
                    <p className="font-mono text-xs text-slate-500" dir="ltr">
                      {r.role_code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-cyan-400 hover:bg-slate-800"
                      onClick={() => setRoleForm(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!r.is_system && (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-red-400 hover:bg-slate-800"
                        onClick={() => setDeleteRole(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : subTab === 'matrix' ? (
        <PermissionsMatrixTab
          mode={matrixMode}
          onModeChange={setMatrixMode}
          roles={roles}
          users={users}
          permissions={permissions}
          selectedRoleId={selectedRoleId}
          selectedUserId={selectedMatrixUserId}
          onSelectRole={setSelectedRoleId}
          onSelectUser={setSelectedMatrixUserId}
          rolePerms={matrixMode === 'user' ? userMatrixPerms : rolePerms}
          overrideKeys={matrixMode === 'user' ? userOverrideKeys : undefined}
          roleBasePerms={matrixMode === 'user' ? userRoleBasePerms : undefined}
          onSetPermission={handleSetPermission}
          onSetPermissions={handleSetPermissions}
          onError={msg => notify(msg, true)}
        />
      ) : subTab === 'activeUsers' ? (
        <ActiveUsersTab notify={notify} />
      ) : (
        <div className="card-industrial p-4">
          <ul className="space-y-2">
            {users.filter(u => u.is_blocked).map(u => (
              <li key={u.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">
                <p className="font-bold text-white">{u.email}</p>
                <p className="text-red-200">{u.blocked_reason}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-emerald-400"
                  onClick={() => void unblockUser(u.id).then(() => reload().then(() => notify(t('permissions.userUnblocked'))))}
                >
                  {t('permissions.unblockUser')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <UserAccountFormModal
        open={Boolean(userForm)}
        mode={userForm?.mode ?? 'create'}
        user={userForm?.user ?? null}
        roles={roles.filter(r => r.is_active)}
        employees={employees}
        onClose={() => setUserForm(null)}
        onSaved={() => {
          notify(t('settings.updated'))
          void reload()
        }}
      />

      <UserPasswordModal
        open={Boolean(passwordUser)}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSaved={() => notify(t('permissions.passwordResetSuccess'))}
      />

      <SystemRoleFormModal
        open={roleForm !== null}
        role={roleForm === 'new' || roleForm === null ? null : roleForm}
        onClose={() => setRoleForm(null)}
        onSaved={() => {
          notify(t('settings.updated'))
          void reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteUser)}
        title={t('permissions.deactivateUserTitle')}
        message={t('permissions.deactivateUserMsg', { email: deleteUser?.email ?? '' })}
        confirmLabel={t('common.confirm')}
        busy={busy}
        onCancel={() => setDeleteUser(null)}
        onConfirm={() => void confirmDeactivateUser()}
      />

      <ConfirmDialog
        open={Boolean(deleteRole)}
        title={t('permissions.deleteRoleTitle')}
        message={t('permissions.deleteRoleMsg', { name: deleteRole?.role_name_ar ?? '' })}
        confirmLabel={t('common.delete')}
        busy={busy}
        onCancel={() => setDeleteRole(null)}
        onConfirm={() => void confirmDeleteRole()}
      />

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
            <button
              disabled={busy || !blockReason.trim()}
              onClick={() => void confirmBlock()}
              className="rounded-xl bg-red-500 px-4 py-2 font-black text-white disabled:opacity-50"
            >
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
