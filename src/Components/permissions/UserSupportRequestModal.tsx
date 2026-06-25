import { useEffect, useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { submitUserSupportRequest } from '../../services/userRequestsService'
import type { UserRequestType } from '../../Types/userRequest'

const REQUEST_TYPES: UserRequestType[] = ['password_reset', 'complaint', 'account_issue', 'other']

type Props = {
  open: boolean
  onClose: () => void
  defaultEmail?: string
  defaultName?: string
  defaultType?: UserRequestType
  onSubmitted?: () => void
}

export function UserSupportRequestModal({
  open,
  onClose,
  defaultEmail = '',
  defaultName = '',
  defaultType = 'password_reset',
  onSubmitted
}: Props) {
  const { t } = useLang()
  const [type, setType] = useState<UserRequestType>(defaultType)
  const [email, setEmail] = useState(defaultEmail)
  const [name, setName] = useState(defaultName)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(defaultType)
    setEmail(defaultEmail)
    setName(defaultName)
    setMessage('')
    setErr('')
    setOk(false)
  }, [open, defaultEmail, defaultName, defaultType])

  async function submit() {
    if (!email.trim() || message.trim().length < 10) {
      setErr(t('userRequests.validation'))
      return
    }
    setBusy(true)
    setErr('')
    try {
      await submitUserSupportRequest({ type, email, message, name: name || undefined })
      setOk(true)
      onSubmitted?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('userRequests.submitTitle')}
      icon={<MessageSquarePlus className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        ok ? (
          <button type="button" onClick={onClose} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950">
            {t('common.close')}
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('userRequests.submit')}
            </button>
          </>
        )
      }
    >
      {ok ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {t('userRequests.submitSuccess')}
        </p>
      ) : (
        <>
          {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
          <div className="space-y-3">
            <Field label={t('userRequests.type')} required>
              <select className={inputCls()} value={type} onChange={e => setType(e.target.value as UserRequestType)}>
                {REQUEST_TYPES.map(rt => (
                  <option key={rt} value={rt}>
                    {t(`userRequests.types.${rt}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('permissions.userEmail')} required>
              <input className={inputCls()} type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label={t('userRequests.yourName')}>
              <input className={inputCls()} value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label={t('userRequests.message')} required>
              <textarea
                className={`${inputCls()} min-h-24`}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('userRequests.messagePlaceholder')}
              />
            </Field>
          </div>
        </>
      )}
    </Modal>
  )
}
