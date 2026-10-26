import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { inputCls } from '../FormField'
import type { StationOperationDetail } from '../../Types/timeStudy'
import { OperationPrecedencePicker } from './OperationPrecedencePicker'
import {
  computeRankedPositionalWeightMinutes,
  encodePredecessorIds,
  parsePredecessorIds,
  type PredecessorCandidate
} from '../../Utils/operationPrecedence'
import type { StationOperationStudyFields } from '../../services/stationOperationsService'

type Props = {
  open: boolean
  operation: StationOperationDetail | null
  predecessorCandidates: PredecessorCandidate[]
  busy: boolean
  canSave: boolean
  onClose: () => void
  onSubmit: (input: StationOperationStudyFields) => Promise<void>
}

export function OperationStudyFieldsModal({
  open,
  operation,
  predecessorCandidates,
  busy,
  canSave,
  onClose,
  onSubmit
}: Props) {
  const { t } = useLang()
  const [technicianPosition, setTechnicianPosition] = useState('')
  const [predecessorIds, setPredecessorIds] = useState<string[]>([])
  const [zoningConstraints, setZoningConstraints] = useState('')

  useEffect(() => {
    if (!open) return
    setTechnicianPosition(operation?.technicianPosition ?? '')
    setPredecessorIds(parsePredecessorIds(operation?.taskPrecedence))
    setZoningConstraints(operation?.zoningConstraints ?? '')
  }, [open, operation])

  const rankedMinutes = useMemo(
    () => computeRankedPositionalWeightMinutes(predecessorIds, predecessorCandidates),
    [predecessorIds, predecessorCandidates]
  )

  async function save() {
    if (!canSave) return
    await onSubmit({
      technicianPosition: technicianPosition.trim() || null,
      taskPrecedence: encodePredecessorIds(predecessorIds),
      rankedPositionalWeight: rankedMinutes,
      zoningConstraints: zoningConstraints.trim() || null
    })
  }

  return (
    <Modal
      open={open}
      title={t('operations.studyFieldsTitle')}
      subtitle={operation?.operationNameAr ?? undefined}
      icon={<MapPin className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            disabled={busy}
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200"
          >
            {t('common.cancel')}
          </button>
          {canSave ? (
            <button
              disabled={busy}
              onClick={() => void save()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('common.saveEdit')}
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.techPosition')}</span>
          <input
            className={inputCls()}
            value={technicianPosition}
            onChange={e => setTechnicianPosition(e.target.value)}
            disabled={!canSave}
          />
        </label>

        <OperationPrecedencePicker
          candidates={predecessorCandidates}
          selectedIds={predecessorIds}
          onChange={canSave ? setPredecessorIds : () => undefined}
        />

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.zoning')}</span>
          <input
            className={inputCls()}
            value={zoningConstraints}
            onChange={e => setZoningConstraints(e.target.value)}
            dir="ltr"
            disabled={!canSave}
          />
        </label>
      </div>
    </Modal>
  )
}
