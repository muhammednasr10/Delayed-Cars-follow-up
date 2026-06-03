import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { moveStationOperation } from '../../services/stationOperationsService'
import type { ParentStationOperationsGroup, StationOperationDetail } from '../../Types/timeStudy'

export type WorkerMoveTarget = {
  stationId: string
  parentLabel: string
  workerLabel: string
}

type Props = {
  open: boolean
  operation: StationOperationDetail | null
  currentWorkerStationId: string
  parentGroups: ParentStationOperationsGroup[]
  busy: boolean
  onClose: () => void
  onMoved: () => Promise<void>
  onError: (msg: string) => void
}

export function MoveOperationModal({
  open,
  operation,
  currentWorkerStationId,
  parentGroups,
  busy,
  onClose,
  onMoved,
  onError
}: Props) {
  const { t } = useLang()
  const [targetId, setTargetId] = useState('')

  const targets = useMemo((): WorkerMoveTarget[] => {
    const list: WorkerMoveTarget[] = []
    for (const p of parentGroups) {
      const parentLabel = `${p.displayCode} — ${p.stationName}`
      for (const w of p.workers) {
        if (w.stationId === currentWorkerStationId) continue
        const workerLabel =
          w.workerIndex != null
            ? `${t('operations.workerN', { n: w.workerIndex })} (${w.displayCode})`
            : w.displayCode
        list.push({ stationId: w.stationId, parentLabel, workerLabel })
      }
    }
    return list
  }, [parentGroups, currentWorkerStationId, t])

  useEffect(() => {
    if (open) setTargetId(targets[0]?.stationId ?? '')
  }, [open, targets])

  async function save() {
    if (!operation || !targetId) return
    try {
      await moveStationOperation(operation.id, targetId)
      await onMoved()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'OPERATION_NAME_EXISTS_ON_TARGET') {
        onError(t('operations.moveDuplicate'))
      } else {
        onError(msg || t('common.error'))
      }
    }
  }

  return (
    <Modal
      open={open}
      title={t('operations.moveOperation')}
      icon={<ArrowRightLeft className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            disabled={busy || !targetId || !operation}
            onClick={save}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('operations.moveConfirm')}
          </button>
        </>
      }
    >
      {operation && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            <span className="font-bold text-white">{operation.operationNameAr}</span>
          </p>
          <p className="text-xs text-slate-500">{t('operations.moveHint')}</p>
          <Field label={t('operations.moveTarget')}>
            <select className={inputCls()} value={targetId} onChange={e => setTargetId(e.target.value)}>
              {targets.length === 0 ? (
                <option value="">{t('operations.moveNoTargets')}</option>
              ) : (
                targets.map(tg => (
                  <option key={tg.stationId} value={tg.stationId}>
                    {tg.parentLabel} → {tg.workerLabel}
                  </option>
                ))
              )}
            </select>
          </Field>
        </div>
      )}
    </Modal>
  )
}
