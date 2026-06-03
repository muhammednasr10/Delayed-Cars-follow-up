import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { createWorkerStation } from '../../services/stationOperationsService'

type Props = {
  open: boolean
  parentStationId: string | null
  defaultCode: string
  busy: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}

export function WorkerStationForm({ open, parentStationId, defaultCode, busy, onClose, onSaved }: Props) {
  const { t } = useLang()
  const [code, setCode] = useState(defaultCode)
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) {
      setCode(defaultCode)
      setName('')
    }
  }, [open, defaultCode])

  async function save() {
    if (!parentStationId || !code.trim() || !name.trim()) return
    await createWorkerStation({
      parentStationId,
      workerCode: code.trim(),
      workerName: name.trim()
    })
    await onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('operations.addWorker')}
      icon={<UserPlus className="h-5 w-5" />}
      onClose={onClose}
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            disabled={busy || !parentStationId || !code.trim() || !name.trim()}
            onClick={save}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('operations.workerLineCode')} required>
          <input className={inputCls()} value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="PBS1-L1" />
        </Field>
        <Field label={t('operations.workerStationName')} required>
          <input
            className={inputCls()}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('operations.stationNamePh')}
          />
        </Field>
        {!parentStationId && <p className="text-xs text-amber-300">{t('operations.noParentStationId')}</p>}
      </div>
    </Modal>
  )
}
