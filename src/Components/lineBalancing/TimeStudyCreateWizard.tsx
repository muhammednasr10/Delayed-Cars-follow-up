import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, MapPin, User, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { MODEL_LINES, MODEL_LINE_STYLES, type ModelLine } from '../../Utils/modelLines'
import { familyModelIdForLine } from '../../Utils/operationClassificationBuilder'
import { operationMatchesLineFilter } from '../../Utils/operationClassification'
import { getVariantsForLine } from '../../Utils/lineClassifications'
import { formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import type { ParentStationOperationsGroup, StationOperationDetail } from '../../Types/timeStudy'
import type { TimeStudyMeasureSession, TimeStudyMeasurementScope } from '../../Types/engineering'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  open: boolean
  models: VehicleModel[]
  parentGroups: ParentStationOperationsGroup[]
  onClose: () => void
  onStart: (session: TimeStudyMeasureSession) => void
}

type Step = 'model' | 'scope' | 'select'

type OpOption = {
  id: string
  name: string
  stationId: string
  workerStationId: string | null
  workerCode: string | null
  parentCode: string
  parentName: string
  parentStationId: string
}

export function TimeStudyCreateWizard({ open, models, parentGroups, onClose, onStart }: Props) {
  const { t } = useLang()
  const [step, setStep] = useState<Step>('model')
  const [modelLine, setModelLine] = useState<ModelLine>(MODEL_LINES[0])
  const [scope, setScope] = useState<TimeStudyMeasurementScope | ''>('')
  const [parentKey, setParentKey] = useState('')
  const [workerKey, setWorkerKey] = useState('')
  const [operationId, setOperationId] = useState('')

  const lineFamilyId = useMemo(() => familyModelIdForLine(models, modelLine), [models, modelLine])
  const lineVariants = useMemo(() => getVariantsForLine(models, modelLine), [models, modelLine])

  const filteredParents = useMemo(() => {
    return parentGroups
      .map(p => ({
        ...p,
        workers: p.workers.map(w => ({
          ...w,
          operations: w.operations.filter(op => {
            if (lineFamilyId && op.parentModelId && op.parentModelId !== lineFamilyId) return false
            return operationMatchesLineFilter(op.operationType, modelLine, '', lineVariants)
          })
        }))
      }))
      .filter(p => p.workers.length > 0)
  }, [parentGroups, modelLine, lineFamilyId, lineVariants])

  const selectedParent = filteredParents.find(
    p => (p.stationId ?? p.stationNumber) === parentKey || p.stationNumber === parentKey
  )

  const selectedWorker = selectedParent?.workers.find(w => w.stationId === workerKey)

  const parentOps = useMemo(() => {
    if (!selectedParent) return [] as OpOption[]
    const ops: OpOption[] = []
    for (const worker of selectedParent.workers) {
      for (const op of worker.operations) {
        ops.push({
          id: op.id,
          name: op.operationNameAr,
          stationId: selectedParent.stationId ?? worker.stationId,
          workerStationId: worker.stationId,
          workerCode: formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber),
          parentCode: selectedParent.displayCode,
          parentName: selectedParent.stationName,
          parentStationId: selectedParent.stationId ?? worker.stationId
        })
      }
    }
    return ops
  }, [selectedParent])

  const workerOps = useMemo(() => {
    if (!selectedWorker || !selectedParent) return [] as OpOption[]
    return selectedWorker.operations.map((op: StationOperationDetail) => ({
      id: op.id,
      name: op.operationNameAr,
      stationId: selectedWorker.stationId,
      workerStationId: selectedWorker.stationId,
      workerCode: formatStationWorkerDisplayCode(selectedWorker.displayCode || selectedWorker.stationNumber),
      parentCode: selectedParent.displayCode,
      parentName: selectedParent.stationName,
      parentStationId: selectedParent.stationId ?? selectedWorker.stationId
    }))
  }, [selectedWorker, selectedParent])

  const scopeLabel =
    scope === 'station'
      ? t('engineering.timeStudy.scopeStation')
      : scope === 'worker'
        ? t('engineering.timeStudy.scopeWorker')
        : scope === 'operation'
          ? t('engineering.timeStudy.scopeOperation')
          : ''

  const pickHint =
    scope === 'station'
      ? t('engineering.timeStudy.pickTargetStation')
      : scope === 'worker'
        ? t('engineering.timeStudy.pickTargetWorker')
        : t('engineering.timeStudy.pickTargetOperation')

  function reset() {
    setStep('model')
    setScope('')
    setParentKey('')
    setWorkerKey('')
    setOperationId('')
  }

  function close() {
    reset()
    onClose()
  }

  function buildSubject(parts: { parentCode: string; workerCode?: string | null; opName?: string }): string {
    if (scope === 'station') {
      return `${t('engineering.timeStudy.scopeStation')}: ${parts.parentCode}`
    }
    if (scope === 'worker') {
      return `${t('engineering.timeStudy.scopeWorker')}: ${parts.parentCode} · ${parts.workerCode}`
    }
    return `${t('engineering.timeStudy.scopeOperation')}: ${parts.opName}`
  }

  function confirmSelection() {
    if (!selectedParent || !scope) return

    let session: TimeStudyMeasureSession | null = null

    if (scope === 'station') {
      const anchor = parentOps[0]
      if (!anchor || !selectedParent.stationId) return
      session = {
        modelLine,
        vehicleModelId: lineFamilyId,
        scope: 'station',
        parentStationId: selectedParent.stationId,
        parentDisplayCode: selectedParent.displayCode,
        parentStationName: selectedParent.stationName,
        workerStationId: null,
        workerDisplayCode: null,
        operationId: anchor.id,
        operationName: selectedParent.stationName,
        stationId: selectedParent.stationId,
        subjectLabel: buildSubject({ parentCode: selectedParent.displayCode })
      }
    } else if (scope === 'worker') {
      const anchor = workerOps[0]
      if (!selectedWorker || !anchor) return
      session = {
        modelLine,
        vehicleModelId: lineFamilyId,
        scope: 'worker',
        parentStationId: anchor.parentStationId,
        parentDisplayCode: anchor.parentCode,
        parentStationName: anchor.parentName,
        workerStationId: selectedWorker.stationId,
        workerDisplayCode: formatStationWorkerDisplayCode(
          selectedWorker.displayCode || selectedWorker.stationNumber
        ),
        operationId: anchor.id,
        operationName: anchor.name,
        stationId: selectedWorker.stationId,
        subjectLabel: buildSubject({
          parentCode: anchor.parentCode,
          workerCode: formatStationWorkerDisplayCode(selectedWorker.displayCode || selectedWorker.stationNumber)
        })
      }
    } else {
      const op = workerOps.find(o => o.id === operationId)
      if (!op || !selectedWorker) return
      session = {
        modelLine,
        vehicleModelId: lineFamilyId,
        scope: 'operation',
        parentStationId: op.parentStationId,
        parentDisplayCode: op.parentCode,
        parentStationName: op.parentName,
        workerStationId: op.workerStationId,
        workerDisplayCode: op.workerCode,
        operationId: op.id,
        operationName: op.name,
        stationId: op.stationId,
        subjectLabel: buildSubject({ parentCode: op.parentCode, opName: op.name })
      }
    }

    if (!session) return
    onStart(session)
    close()
  }

  const hasOpsForStation = parentOps.length > 0
  const hasOpsForWorker = workerOps.length > 0

  const canConfirm =
    scope === 'station'
      ? Boolean(selectedParent?.stationId && hasOpsForStation)
      : scope === 'worker'
        ? Boolean(selectedParent && selectedWorker && hasOpsForWorker)
        : Boolean(selectedParent && selectedWorker && operationId)

  return (
    <Modal
      open={open}
      title={t('engineering.timeStudy.newStudy')}
      onClose={close}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex w-full justify-between gap-2">
          <button type="button" onClick={close} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          {step === 'select' ? (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={confirmSelection}
              className="rounded-xl bg-violet-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {t('engineering.timeStudy.startMeasure')}
            </button>
          ) : step === 'scope' ? (
            <button
              type="button"
              disabled={!scope}
              onClick={() => setStep('select')}
              className="rounded-xl bg-violet-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5 p-5">
        {step === 'model' && (
          <>
            <p className="text-sm text-slate-400">{t('engineering.timeStudy.pickModel')}</p>
            <div className="flex flex-wrap gap-2">
              {MODEL_LINES.map(line => (
                <button
                  key={line}
                  type="button"
                  onClick={() => {
                    setModelLine(line)
                    setStep('scope')
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                    modelLine === line ? MODEL_LINE_STYLES[line].tabActive : MODEL_LINE_STYLES[line].tabIdle
                  }`}
                >
                  {line}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'scope' && (
          <>
            <ContextBar model={modelLine} scope={null} />
            <p className="text-sm text-slate-400">{t('engineering.timeStudy.pickScope')}</p>
            <div className="grid gap-2">
              {(
                [
                  { id: 'station', icon: MapPin, label: t('engineering.timeStudy.scopeStation') },
                  { id: 'worker', icon: User, label: t('engineering.timeStudy.scopeWorker') },
                  { id: 'operation', icon: Wrench, label: t('engineering.timeStudy.scopeOperation') }
                ] as const
              ).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScope(item.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    scope === item.id
                      ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                      : 'border-slate-700/80 bg-slate-900/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0 opacity-80" />
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setStep('model')}>
              ← {t('engineering.timeStudy.changeModel')}
            </button>
          </>
        )}

        {step === 'select' && (
          <>
            <ContextBar model={modelLine} scope={scopeLabel} />
            <p className="text-sm text-slate-400">{pickHint}</p>

            <div className="space-y-4">
              <WizardField label={t('settings.cols.stationName')} required>
                <SelectInput
                  value={parentKey}
                  onChange={v => {
                    setParentKey(v)
                    setWorkerKey('')
                    setOperationId('')
                  }}
                >
                  <option value="">{t('engineering.timeStudy.selectStation')}</option>
                  {filteredParents.map(p => (
                    <option key={p.stationId ?? p.stationNumber} value={p.stationId ?? p.stationNumber}>
                      {p.displayCode} — {p.stationName}
                    </option>
                  ))}
                </SelectInput>
              </WizardField>

              {scope !== 'station' && selectedParent && (
                <WizardField label={t('engineering.timeStudy.workerLine')} required>
                  <SelectInput
                    value={workerKey}
                    onChange={v => {
                      setWorkerKey(v)
                      setOperationId('')
                    }}
                  >
                    <option value="">{t('engineering.timeStudy.selectWorker')}</option>
                    {selectedParent.workers.map(w => (
                      <option key={w.stationId} value={w.stationId}>
                        {formatStationWorkerDisplayCode(w.displayCode || w.stationNumber)}
                      </option>
                    ))}
                  </SelectInput>
                </WizardField>
              )}

              {scope === 'operation' && selectedWorker && (
                <WizardField label={t('engineering.operation')} required>
                  <SelectInput value={operationId} onChange={setOperationId}>
                    <option value="">{t('engineering.selectOperation')}</option>
                    {workerOps.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </SelectInput>
                </WizardField>
              )}
            </div>

            {selectedParent && scope === 'station' && !hasOpsForStation && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {t('engineering.timeStudy.noOpsForModel')}
              </p>
            )}

            {selectedParent && scope === 'worker' && selectedWorker && !hasOpsForWorker && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {t('engineering.timeStudy.noOpsForModel')}
              </p>
            )}

            {selectedParent && scope === 'operation' && selectedWorker && workerOps.length === 0 && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {t('engineering.timeStudy.noOpsForModel')}
              </p>
            )}

            {canConfirm && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {t('engineering.timeStudy.readyToMeasure')}
              </div>
            )}

            <button type="button" className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setStep('scope')}>
              ← {t('engineering.timeStudy.changeScope')}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

function ContextBar({ model, scope }: { model: string; scope: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-200">{model}</span>
      {scope && (
        <span className="rounded-lg bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">{scope}</span>
      )}
    </div>
  )
}

function WizardField({
  label,
  required,
  children
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}

function SelectInput({
  value,
  onChange,
  children
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <select
        className="input-dark w-full appearance-none pe-9"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  )
}
