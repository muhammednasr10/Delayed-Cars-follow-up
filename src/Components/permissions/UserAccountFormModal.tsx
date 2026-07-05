import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import {
  createUserAccount,
  resetUserPassword,
  updateUserAccount,
  type CreateUserAccountInput,
  type UpdateUserAccountInput
} from '../../services/userAccountsService'
import type { SystemRole } from '../../Types/permissions'
import type { UserAccountDetail } from '../../Types/permissions'
import type { Employee } from '../../Types/employee'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  user: UserAccountDetail | null
  roles: SystemRole[]
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}

export function UserAccountFormModal({ open, mode, user, roles, employees, onClose, onSaved }: Props) {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [systemRoleId, setSystemRoleId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [resetPw, setResetPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    setPassword('')
    setResetPw('')
    if (mode === 'edit' && user) {
      setEmail(user.email ?? '')
      setFullName(user.full_name ?? '')
      setSystemRoleId(user.system_role_id ?? '')
      setEmployeeId(user.employee_id ?? '')
      setIsActive(user.is_active)
    } else {
      setEmail('')
      setFullName('')
      setSystemRoleId(roles.find(r => r.role_code === 'viewer')?.id ?? roles[0]?.id ?? '')
      setEmployeeId('')
      setIsActive(true)
    }
  }, [open, mode, user, roles])

  async function save() {
    setBusy(true)
    setErr('')
    try {
      if (mode === 'create') {
        if (!email.trim() || password.length < 6) {
          setErr(t('permissions.createUserValidation'))
          return
        }
        const input: CreateUserAccountInput = {
          email: email.trim(),
          password,
          fullName: fullName.trim() || undefined,
          systemRoleId: systemRoleId || undefined,
          employeeId: employeeId || null
        }
        await createUserAccount(input)
      } else if (user) {
        if (!email.trim()) {
          setErr(t('permissions.emailRequired'))
          return
        }
        const patch: UpdateUserAccountInput = {
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          systemRoleId: systemRoleId || undefined,
          employeeId: employeeId || null,
          isActive
        }
        await updateUserAccount(user.id, patch)
        if (resetPw.length >= 6) {
          await resetUserPassword(user.id, resetPw)
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE_EMAIL') setErr(t('permissions.duplicateEmail'))
      else if (msg === 'EMAIL_REQUIRED') setErr(t('permissions.emailRequired'))
      else setErr(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={mode === 'create' ? t('permissions.addUser') : t('permissions.editUser')}
      icon={<UserPlus className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      <div className="space-y-3">
        <Field label={t('permissions.userEmail')} required>
          <input
            className={inputCls()}
            type="text"
            dir="ltr"
            autoComplete="off"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </Field>
        {mode === 'create' ? (
          <Field label={t('permissions.password')} required>
            <input
              className={inputCls()}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>
        ) : (
          <Field label={t('permissions.newPassword')}>
            <input
              className={inputCls()}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              placeholder={t('permissions.passwordOptional')}
              value={resetPw}
              onChange={e => setResetPw(e.target.value)}
            />
          </Field>
        )}
        <Field label={t('permissions.displayName')}>
          <input className={inputCls()} value={fullName} onChange={e => setFullName(e.target.value)} />
        </Field>
        <Field label={t('permissions.systemRole')} required>
          <select className={inputCls()} value={systemRoleId} onChange={e => setSystemRoleId(e.target.value)}>
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.role_name_ar}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('permissions.employee')}>
          <select className={inputCls()} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">{t('permissions.noEmployee')}</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.employeeCode} — {e.fullName}
              </option>
            ))}
          </select>
        </Field>
        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            {t('permissions.accountActive')}
          </label>
        )}
      </div>
    </Modal>
  )
}
