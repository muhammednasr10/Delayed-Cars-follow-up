import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import type { StationOperationDetail } from '../../Types/timeStudy'
import type { StationOperationUpdate } from '../../services/stationOperationsService'
import { formatOperationClassification } from '../../Utils/operationClassification'
import { getPresetsForLine } from '../../Utils/lineClassifications'
import type { ModelLine } from '../../Utils/modelLines'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  operation: StationOperationDetail | null
  modelLine?: ModelLine | null
  busy: boolean
  onClose: () => void
  onSubmit: (input: StationOperationUpdate) => Promise<void>
}

export function StationOperationForm({ open, mode, operation, modelLine, busy, onClose, onSubmit }: Props) {
  const { t } = useLang()
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [opType, setOpType] = useState('common')
  const [timeMin, setTimeMin] = useState('')
  const [workerMin, setWorkerMin] = useState('')
  const [manpower, setManpower] = useState('1')
  const [notes, setNotes] = useState('')
  const [critical, setCritical] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !operation) {
      setNameAr('')
      setNameEn('')
      setOpType('common')
      setTimeMin('')
      setWorkerMin('')
      setManpower('1')
      setNotes('')
      setCritical(false)
      return
    }
    setNameAr(operation.operationNameAr)
    setNameEn(operation.operationNameEn ?? '')
    setOpType(operation.operationType)
    setTimeMin(operation.standardTimeMinutes != null ? String(operation.standardTimeMinutes) : '')
    setWorkerMin(operation.workerTimeMinutes != null ? String(operation.workerTimeMinutes) : '')
    setManpower(String(operation.requiredManpowerCount))
    setNotes(operation.notes ?? '')
    setCritical(operation.isCritical)
  }, [open, mode, operation])

  const linePresets = modelLine ? getPresetsForLine(modelLine) : getPresetsForLine('T4')
  const inPreset = linePresets.some(p => p.value === opType)
  const selectValue = inPreset ? opType : '_custom'

  async function save() {
    if (!nameAr.trim()) return
    await onSubmit({
      operationNameAr: nameAr,
      operationNameEn: nameEn || null,
      operationType: opType,
      standardTimeMinutes: timeMin ? Number(timeMin) : null,
      workerTimeMinutes: workerMin ? Number(workerMin) : null,
      requiredManpowerCount: Number(manpower) || 1,
      notes: notes || null,
      isCritical: critical
    })
  }

  return (
    <Modal open={open} title={mode === 'create' ? t('operations.addOperation') : t('operations.editOp')} icon={<Wrench className="h-5 w-5" />} onClose={onClose} maxWidthClass="max-w-2xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">{t('common.cancel')}</button>
          <button disabled={busy} onClick={save} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50">{busy ? t('common.saving') : t('common.saveEdit')}</button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('operations.opName')} required>
          <input className={inputCls()} value={nameAr} onChange={e => setNameAr(e.target.value)} />
        </Field>
        <Field label={t('operations.opType')}>
          <select
            className={inputCls()}
            value={selectValue}
            onChange={e => {
              const v = e.target.value
              if (v === '_custom') setOpType('')
              else setOpType(v)
            }}
          >
            {linePresets.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
            <option value="_custom">{t('operations.opTypeCustom')}</option>
          </select>
          {!inPreset && (
            <input
              className={`${inputCls()} mt-2`}
              value={opType}
              placeholder={formatOperationClassification('t4c-t4l-only', modelLine ?? 'T4')}
              onChange={e => setOpType(e.target.value.trim().toLowerCase())}
            />
          )}
        </Field>
        <Field label={t('operations.timeMin')}>
          <input type="number" step="0.01" className={inputCls()} value={timeMin} onChange={e => setTimeMin(e.target.value)} />
        </Field>
        <Field label={t('operations.workerMin')}>
          <input type="number" step="0.01" className={inputCls()} value={workerMin} onChange={e => setWorkerMin(e.target.value)} />
        </Field>
        <Field label={t('operations.manpower')}>
          <input type="number" min={1} className={inputCls()} value={manpower} onChange={e => setManpower(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('common.notes')}>
            <textarea className={`${inputCls()} min-h-16`} value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
