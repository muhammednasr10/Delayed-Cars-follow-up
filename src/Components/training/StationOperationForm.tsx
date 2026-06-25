import { useEffect, useMemo, useState } from 'react'
import { Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import type { StationOperationDetail } from '../../Types/timeStudy'
import type { StationOperationUpdate } from '../../services/stationOperationsService'
import {
  encodeOperationClassification,
  familyModelIdForLine,
  initClassificationState,
  secondsToMinutes,
  variantNamesForFamily
} from '../../Utils/operationClassificationBuilder'
import { OperationClassificationPicker } from './OperationClassificationPicker'
import {
  OperationHardwareEditor,
  hardwareDraftsFromOperation,
  hardwareDraftsToInput,
  type HardwareDraft
} from './OperationHardwareEditor'
import { OperationPrecedencePicker } from './OperationPrecedencePicker'
import {
  encodePredecessorIds,
  parsePredecessorIds,
  computeRankedPositionalWeightMinutes,
  type PredecessorCandidate
} from '../../Utils/operationPrecedence'
import type { ModelLine } from '../../Utils/modelLines'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  operation: StationOperationDetail | null
  models: VehicleModel[]
  modelLine: ModelLine
  stationId: string | null
  predecessorCandidates: PredecessorCandidate[]
  workerLabel?: string | null
  busy: boolean
  onClose: () => void
  onSubmit: (input: StationOperationUpdate) => Promise<void>
}

export function StationOperationForm({
  open,
  mode,
  operation,
  models,
  modelLine,
  stationId,
  predecessorCandidates,
  workerLabel,
  busy,
  onClose,
  onSubmit
}: Props) {
  const { t } = useLang()
  const [toolSpec, setToolSpec] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [parentModelId, setParentModelId] = useState('')
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [hardwareRows, setHardwareRows] = useState<HardwareDraft[]>([])
  const [predecessorIds, setPredecessorIds] = useState<string[]>([])
  const [technicianPosition, setTechnicianPosition] = useState('')
  const [zoningConstraints, setZoningConstraints] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [timeMin, setTimeMin] = useState('')
  const [notes, setNotes] = useState('')
  const [critical, setCritical] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'create' || !operation) {
      setToolSpec('')
      setNameAr('')
      setHardwareRows([])
      setPredecessorIds([])
      setTechnicianPosition('')
      setZoningConstraints('')
      setTimeSec('')
      setTimeMin('')
      setNotes('')
      setCritical(false)
      const defaultFamily = familyModelIdForLine(models, modelLine) ?? ''
      setParentModelId(defaultFamily)
      const init = initClassificationState(models, 'common', defaultFamily || null)
      setSelectedVariants(init.selectedVariantNames)
      return
    }
    setToolSpec(operation.toolSpec ?? '')
    setNameAr(operation.operationNameAr)
    const familyId =
      operation.parentModelId ?? familyModelIdForLine(models, modelLine) ?? ''
    setParentModelId(familyId ?? '')
    const init = initClassificationState(models, operation.operationType, familyId)
    setSelectedVariants(init.selectedVariantNames)
    setHardwareRows(hardwareDraftsFromOperation(operation.hardware))
    setTechnicianPosition(operation.technicianPosition ?? '')
    setPredecessorIds(parsePredecessorIds(operation.taskPrecedence))
    setZoningConstraints(operation.zoningConstraints ?? '')
    const opSec =
      operation.standardTimeSeconds != null
        ? String(Math.round(operation.standardTimeSeconds))
        : operation.standardTimeMinutes != null
          ? String(Math.round(operation.standardTimeMinutes * 60))
          : ''
    const opMin =
      operation.standardTimeMinutes != null
        ? String(operation.standardTimeMinutes)
        : operation.standardTimeSeconds != null
          ? String(secondsToMinutes(operation.standardTimeSeconds) ?? '')
          : ''
    setTimeSec(opSec)
    setTimeMin(opMin)
    setNotes(operation.notes ?? '')
    setCritical(operation.isCritical)
  }, [open, mode, operation, models, modelLine])

  const allVariantNames = useMemo(
    () => (parentModelId ? variantNamesForFamily(models, parentModelId) : []),
    [models, parentModelId]
  )

  const classification = useMemo(
    () => encodeOperationClassification(allVariantNames, selectedVariants),
    [allVariantNames, selectedVariants]
  )

  function onOpSecChange(v: string) {
    setTimeSec(v)
    const sec = Number(v)
    if (!v.trim()) {
      setTimeMin('')
      return
    }
    if (Number.isFinite(sec) && sec >= 0) {
      const min = secondsToMinutes(sec)
      setTimeMin(min != null ? String(min) : '')
    }
  }

  function onOpMinChange(v: string) {
    setTimeMin(v)
    const min = Number(v)
    if (!v.trim()) {
      setTimeSec('')
      return
    }
    if (Number.isFinite(min) && min >= 0) {
      setTimeSec(String(Math.round(min * 60)))
    }
  }

  const rankedMinutes = useMemo(
    () => computeRankedPositionalWeightMinutes(predecessorIds, predecessorCandidates),
    [predecessorIds, predecessorCandidates]
  )

  async function save() {
    if (!nameAr.trim() || !parentModelId) return
    const stdSec = timeSec.trim() ? Number(timeSec) : null
    await onSubmit({
      toolSpec: toolSpec.trim() || null,
      operationNameAr: nameAr,
      operationNameEn: null,
      operationType: classification,
      parentModelId,
      standardTimeSeconds: stdSec,
      standardTimeMinutes: secondsToMinutes(stdSec),
      workerTimeMinutes: operation?.workerTimeMinutes ?? null,
      requiredManpowerCount: 1,
      technicianPosition: technicianPosition.trim() || null,
      taskPrecedence: encodePredecessorIds(predecessorIds),
      rankedPositionalWeight: rankedMinutes,
      zoningConstraints: zoningConstraints.trim() || null,
      notes: notes || null,
      isCritical: critical,
      hardware: hardwareDraftsToInput(hardwareRows)
    })
  }

  return (
    <Modal
      open={open}
      title={mode === 'create' ? t('operations.addOperation') : t('operations.editOp')}
      icon={<Wrench className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            disabled={busy || !parentModelId}
            onClick={save}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('common.saveEdit')}
          </button>
        </>
      }
    >
      {workerLabel && (
        <p className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-mono text-cyan-100" dir="ltr">
          {t('operations.cols.stationWorker')}: {workerLabel}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.operationKind')}</span>
          <input className={inputCls()} value={toolSpec} onChange={e => setToolSpec(e.target.value)} />
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">
            {t('operations.opName')} <span className="text-red-400">*</span>
          </span>
          <input className={inputCls()} value={nameAr} onChange={e => setNameAr(e.target.value)} />
        </label>

        <OperationClassificationPicker
          models={models}
          modelLine={modelLine}
          parentModelId={parentModelId}
          selectedVariantNames={selectedVariants}
          classificationPreview={classification}
          onParentModelChange={setParentModelId}
          onVariantsChange={setSelectedVariants}
        />

        <OperationHardwareEditor
          value={hardwareRows}
          onChange={setHardwareRows}
          stationId={stationId}
          modelLine={modelLine}
        />

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.techPosition')}</span>
          <input className={inputCls()} value={technicianPosition} onChange={e => setTechnicianPosition(e.target.value)} />
        </label>

        <OperationPrecedencePicker
          candidates={predecessorCandidates}
          selectedIds={predecessorIds}
          onChange={setPredecessorIds}
        />

        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.zoning')}</span>
          <input className={inputCls()} value={zoningConstraints} onChange={e => setZoningConstraints(e.target.value)} dir="ltr" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.timeSec')}</span>
          <input
            type="number"
            min={0}
            step={1}
            className={inputCls()}
            value={timeSec}
            onChange={e => onOpSecChange(e.target.value)}
            dir="ltr"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-bold text-slate-300">{t('operations.cols.timeMin')}</span>
          <input
            type="number"
            min={0}
            step="any"
            className={inputCls()}
            value={timeMin}
            onChange={e => onOpMinChange(e.target.value)}
            dir="ltr"
          />
        </label>

        <div className="sm:col-span-2">
          <Field label={t('common.notes')}>
            <textarea className={`${inputCls()} min-h-16`} value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
