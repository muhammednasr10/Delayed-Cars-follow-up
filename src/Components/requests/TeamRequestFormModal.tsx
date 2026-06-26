import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { ManagerMultiSelect } from '../ManagerMultiSelect'
import type { Employee } from '../../Types/employee'
import type { TeamRequestInput } from '../../Types/teamRequest'

type Props = {
  open: boolean
  managers: Employee[]
  onClose: () => void
  onSave: (input: TeamRequestInput) => void
  saving?: boolean
}

export function TeamRequestFormModal({ open, managers, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [managerIds, setManagerIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setManagerIds(managers.length > 0 ? [managers[0].id] : [])
      setTitle('')
      setDescription('')
      setError('')
    }
  }, [open, managers])

  function submit() {
    if (!managerIds.length) {
      setError(t('requests.errManager'))
      return
    }
    if (!title.trim()) {
      setError(t('requests.errTitle'))
      return
    }
    onSave({ managerIds, title: title.trim(), description: description.trim() || undefined })
  }

  return (
    <Modal
      open={open}
      title={t('requests.formTitle')}
      subtitle={t('requests.formSubtitleMulti')}
      icon={<Send className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || managers.length === 0}
            onClick={submit}
            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-white hover:bg-violet-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('requests.submit')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {managers.length === 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{t('requests.noManagers')}</div>
        )}
        <Field label={t('requests.cols.managers')} required>
          <ManagerMultiSelect managers={managers} value={managerIds} onChange={setManagerIds} />
        </Field>
        <Field label={t('requests.cols.title')} required>
          <input className={inputCls()} value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label={t('requests.cols.description')}>
          <textarea className={`${inputCls()} min-h-[5rem] resize-y`} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
