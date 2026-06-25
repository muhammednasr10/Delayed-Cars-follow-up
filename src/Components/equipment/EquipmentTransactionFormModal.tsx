import { useEffect, useState } from 'react'
import { Gauge, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../../Utils/datetimeLocal'
import type { CalibrationResult, EquipmentTransactionType, LineEquipment } from '../../Types/equipment'
import { CALIBRATION_RESULTS } from '../../Types/equipment'

export type TransactionFormPayload =
  | { kind: 'calibration'; equipmentId: string; occurredAt: string; calibrationResult: CalibrationResult; nextCalibrationDue?: string | null; notes?: string }
  | { kind: 'scrap'; equipmentId: string; occurredAt: string; scrapReason: string; scrapQty?: number | null; notes?: string }

type Props = {
  open: boolean
  kind: EquipmentTransactionType
  equipment: LineEquipment[]
  onClose: () => void
  onSave: (payload: TransactionFormPayload) => void
  saving?: boolean
}

export function EquipmentTransactionFormModal({ open, kind, equipment, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [equipmentId, setEquipmentId] = useState('')
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocalValue(new Date().toISOString()))
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult>('pass')
  const [nextCalibrationDue, setNextCalibrationDue] = useState('')
  const [scrapReason, setScrapReason] = useState('')
  const [scrapQty, setScrapQty] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const eligible = equipment.filter(e => e.status !== 'scrapped')

  useEffect(() => {
    if (!open) return
    setEquipmentId(eligible[0]?.id ?? '')
    setOccurredAt(toDatetimeLocalValue(new Date().toISOString()))
    setCalibrationResult('pass')
    setNextCalibrationDue('')
    setScrapReason('')
    setScrapQty('')
    setNotes('')
    setError('')
  }, [open, kind])

  function validate(): string | null {
    if (!equipmentId) return t('equipment.errEquipment')
    if (!occurredAt) return t('equipment.errDate')
    if (kind === 'scrap' && !scrapReason.trim()) return t('equipment.errScrapReason')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const iso = fromDatetimeLocalValue(occurredAt)
    if (kind === 'calibration') {
      onSave({
        kind: 'calibration',
        equipmentId,
        occurredAt: iso,
        calibrationResult,
        nextCalibrationDue: nextCalibrationDue || null,
        notes: notes.trim() || undefined
      })
    } else {
      onSave({
        kind: 'scrap',
        equipmentId,
        occurredAt: iso,
        scrapReason: scrapReason.trim(),
        scrapQty: scrapQty ? Math.max(0, Number(scrapQty)) : null,
        notes: notes.trim() || undefined
      })
    }
  }

  const icon = kind === 'calibration' ? <Gauge className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />

  return (
    <Modal
      open={open}
      title={kind === 'calibration' ? t('equipment.logCalibration') : t('equipment.logScrap')}
      subtitle={t(`equipment.txHints.${kind}`)}
      icon={icon}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving || eligible.length === 0}
            onClick={submit}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {eligible.length === 0 && <p className="text-sm text-amber-200">{t('equipment.noEligibleEquipment')}</p>}
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('equipment.cols.equipment')} required>
          <select className={inputCls()} value={equipmentId} onChange={e => setEquipmentId(e.target.value)}>
            <option value="">{t('equipment.selectEquipment')}</option>
            {eligible.map(e => (
              <option key={e.id} value={e.id}>
                {e.equipmentCode} {e.name ? `— ${e.name}` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('equipment.cols.occurredAt')} required>
          <input type="datetime-local" className={inputCls()} value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
        </Field>

        {kind === 'calibration' ? (
          <>
            <Field label={t('equipment.cols.calibrationResult')} required>
              <select className={inputCls()} value={calibrationResult} onChange={e => setCalibrationResult(e.target.value as CalibrationResult)}>
                {CALIBRATION_RESULTS.map(key => (
                  <option key={key} value={key}>
                    {t(`equipment.calibration.${key}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('equipment.cols.nextCalibration')}>
              <input type="date" className={inputCls()} value={nextCalibrationDue} onChange={e => setNextCalibrationDue(e.target.value)} />
            </Field>
          </>
        ) : (
          <>
            <Field label={t('equipment.cols.scrapReason')} required>
              <input className={inputCls()} value={scrapReason} onChange={e => setScrapReason(e.target.value)} placeholder={t('equipment.scrapReasonPlaceholder')} />
            </Field>
            <Field label={t('equipment.cols.scrapQty')}>
              <input type="number" min={0} className={inputCls()} value={scrapQty} onChange={e => setScrapQty(e.target.value)} />
            </Field>
          </>
        )}

        <Field label={t('common.notes')}>
          <textarea className={`${inputCls()} min-h-[3rem] resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
