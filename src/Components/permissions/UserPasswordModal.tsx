import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { resetUserPassword } from '../../services/userAccountsService'
import type { UserAccountDetail } from '../../Types/permissions'

type Props = {
  open: boolean
  user: UserAccountDetail | null
  onClose: () => void
  onSaved: () => void
}

export function UserPasswordModal({ open, user, onClose, onSaved }: Props) {
  const { t } = useLang()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setNewPassword('')
    setConfirmPassword('')
    setErr('')
  }, [open, user?.id])

  async function save() {
    if (!user) return
    if (newPassword.length < 6) {
      setErr(t('permissions.createUserValidation'))
      return
    }
    if (newPassword !== confirmPassword) {
      setErr(t('permissions.passwordMismatch'))
      return
    }

    setBusy(true)
    setErr('')
    try {
      await resetUserPassword(user.id, newPassword)
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('permissions.resetPasswordTitle')}
      subtitle={user?.email ?? undefined}
      icon={<KeyRound className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
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
            {busy ? t('common.saving') : t('permissions.saveNewPassword')}
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
        {t('permissions.resetPasswordHint')}
      </p>
      <div className="space-y-3">
        <Field label={t('permissions.newPassword')} required>
          <input
            className={inputCls()}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label={t('permissions.confirmPassword')} required>
          <input
            className={inputCls()}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void save()
            }}
          />
        </Field>
      </div>
    </Modal>
  )
}
