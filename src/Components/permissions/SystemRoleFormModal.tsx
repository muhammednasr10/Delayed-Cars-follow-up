import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { upsertSystemRole, type SystemRoleInput } from '../../services/permissionsService'
import type { SystemRole } from '../../Types/permissions'

type Props = {
  open: boolean
  role: SystemRole | null
  onClose: () => void
  onSaved: () => void
}

export function SystemRoleFormModal({ open, role, onClose, onSaved }: Props) {
  const { t } = useLang()
  const [roleCode, setRoleCode] = useState('')
  const [roleNameAr, setRoleNameAr] = useState('')
  const [roleNameEn, setRoleNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    if (role) {
      setRoleCode(role.role_code)
      setRoleNameAr(role.role_name_ar)
      setRoleNameEn(role.role_name_en ?? '')
      setDescription(role.description ?? '')
    } else {
      setRoleCode('')
      setRoleNameAr('')
      setRoleNameEn('')
      setDescription('')
    }
  }, [open, role])

  async function save() {
    if (!roleNameAr.trim() || (!role && !roleCode.trim())) {
      setErr(t('permissions.roleValidation'))
      return
    }
    setBusy(true)
    setErr('')
    try {
      const input: SystemRoleInput = {
        roleCode: role?.is_system ? role.role_code : roleCode,
        roleNameAr: roleNameAr.trim(),
        roleNameEn: roleNameEn.trim() || undefined,
        description: description.trim() || undefined
      }
      await upsertSystemRole(role?.id ?? null, input)
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
      title={role ? t('permissions.editRole') : t('permissions.addRole')}
      icon={<Shield className="h-5 w-5" />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      <div className="space-y-3">
        <Field label={t('permissions.roleCode')} required={!role?.is_system}>
          <input
            className={inputCls()}
            dir="ltr"
            disabled={Boolean(role?.is_system)}
            value={roleCode}
            onChange={e => setRoleCode(e.target.value)}
            placeholder="custom_role"
          />
        </Field>
        <Field label={t('permissions.roleNameAr')} required>
          <input className={inputCls()} value={roleNameAr} onChange={e => setRoleNameAr(e.target.value)} />
        </Field>
        <Field label={t('permissions.roleNameEn')}>
          <input className={inputCls()} value={roleNameEn} onChange={e => setRoleNameEn(e.target.value)} />
        </Field>
        <Field label={t('permissions.roleDescription')}>
          <textarea className={inputCls()} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        {role?.is_system && <p className="text-xs text-slate-500">{t('permissions.systemRoleHint')}</p>}
      </div>
    </Modal>
  )
}
