import { Shield, UserRound } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { SystemPermission, SystemRole, UserAccountDetail } from '../../Types/permissions'
import { PermissionsItemsPanel } from './PermissionsItemsPanel'

type MatrixMode = 'role' | 'user' | 'control'

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
  onPermissionsChanged?: () => Promise<void>
  onNotify?: (message: string, isError?: boolean) => void
  onError: (message: string) => void
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
  onSetPermission,
  onPermissionsChanged,
  onNotify,
  onError
}: Props) {
  const { t } = useLang()
  /** تحكم البنود = نفس واجهة حسب المستخدم */
  const panelMode = mode === 'role' ? 'role' : 'user'

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-wrap gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={() => onModeChange('role')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black sm:text-sm ${
            mode === 'role' ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Shield className="h-4 w-4" />
          {t('permissions.matrix.modeRole')}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('user')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black sm:text-sm ${
            mode === 'user' || mode === 'control'
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <UserRound className="h-4 w-4" />
          {t('permissions.matrix.modeUser')}
        </button>
      </div>

      <PermissionsItemsPanel
        mode={panelMode}
        roles={roles}
        users={users}
        permissions={permissions}
        selectedRoleId={selectedRoleId}
        selectedUserId={selectedUserId}
        onSelectRole={onSelectRole}
        onSelectUser={onSelectUser}
        effectivePerms={rolePerms}
        overrideKeys={panelMode === 'user' ? overrideKeys : undefined}
        onSetPermission={onSetPermission}
        onPermissionsChanged={onPermissionsChanged}
        onNotify={onNotify}
        onError={onError}
      />
    </div>
  )
}
