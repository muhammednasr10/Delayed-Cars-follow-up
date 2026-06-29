import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, MapPin, Save, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { inputCls } from '../FormField'
import { StationOperationsLineFilter } from '../training/stationOperations/StationOperationsLineFilter'
import { HeaderCell } from '../training/stationOperations/StationOperationsLineFilter'
import { formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import { filterParentGroupsByLine } from '../../Utils/filterStationOperationsByLine'
import { getVariantsForLine } from '../../Utils/lineClassifications'
import { familyModelIdForLine } from '../../Utils/operationClassificationBuilder'
import { MODEL_LINES, type ModelLine } from '../../Utils/modelLines'
import { getSopForFamily, upsertOperationSop, upsertWorkerSop } from '../../services/sopService'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../Types/timeStudy'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  parentGroups: ParentStationOperationsGroup[]
  models: VehicleModel[]
  loading: boolean
  loadError: string
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

function SopOperationRow({
  op,
  value,
  canManage,
  saving,
  onChange,
  onSave
}: {
  op: StationOperationDetail
  value: string
  canManage: boolean
  saving: boolean
  onChange: (v: string) => void
  onSave: () => void
}) {
  const { t } = useLang()
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="mb-2 text-sm font-bold text-slate-200">{op.operationNameAr}</p>
      <textarea
        className={`${inputCls()} min-h-[4rem] resize-y text-sm`}
        value={value}
        disabled={!canManage || saving}
        placeholder={t('sop.operationInstructionsPh')}
        onChange={e => onChange(e.target.value)}
      />
      {canManage && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs font-bold text-violet-200 hover:bg-violet-500/30 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      )}
    </div>
  )
}

function SopWorkerPanel({
  worker,
  parent,
  stationInstructions,
  operationInstructions,
  canManage,
  savingWorker,
  savingOpId,
  onStationChange,
  onSaveStation,
  onOperationChange,
  onSaveOperation,
  t
}: {
  worker: WorkerOperationsGroup
  parent: ParentStationOperationsGroup
  stationInstructions: string
  operationInstructions: Record<string, string>
  canManage: boolean
  savingWorker: boolean
  savingOpId: string | null
  onStationChange: (v: string) => void
  onSaveStation: () => void
  onOperationChange: (opId: string, v: string) => void
  onSaveOperation: (opId: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const [open, setOpen] = useState(false)
  const workerCode = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2.5 text-start hover:bg-slate-900"
      >
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
        <Users className="h-4 w-4 shrink-0 text-violet-400" />
        <span className="font-mono text-sm font-black text-violet-200" dir="ltr">
          {workerCode}
        </span>
        <span className="text-xs text-slate-500">
          {worker.operations.length} {t('operations.opsCount')}
        </span>
        <span className="ms-auto text-xs text-slate-600">{parent.displayCode}</span>
      </button>

      {open && (
        <div className="space-y-3 p-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{t('sop.stationInstructions')}</label>
            <textarea
              className={`${inputCls()} min-h-[5rem] resize-y text-sm`}
              value={stationInstructions}
              disabled={!canManage || savingWorker}
              placeholder={t('sop.stationInstructionsPh')}
              onChange={e => onStationChange(e.target.value)}
            />
            {canManage && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={savingWorker}
                  onClick={onSaveStation}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-violet-400 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingWorker ? t('common.saving') : t('sop.saveStation')}
                </button>
              </div>
            )}
          </div>

          {worker.operations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">{t('sop.operationInstructions')}</p>
              {worker.operations.map(op => (
                <SopOperationRow
                  key={op.id}
                  op={op}
                  value={operationInstructions[op.id] ?? ''}
                  canManage={canManage}
                  saving={savingOpId === op.id}
                  onChange={v => onOperationChange(op.id, v)}
                  onSave={() => onSaveOperation(op.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SopParentBlock({
  parent,
  workerStationInstructions,
  operationInstructions,
  canManage,
  savingWorkerId,
  savingOpId,
  onWorkerInstructionsChange,
  onSaveWorker,
  onOperationChange,
  onSaveOperation,
  t
}: {
  parent: ParentStationOperationsGroup
  workerStationInstructions: Record<string, string>
  operationInstructions: Record<string, string>
  canManage: boolean
  savingWorkerId: string | null
  savingOpId: string | null
  onWorkerInstructionsChange: (workerId: string, v: string) => void
  onSaveWorker: (workerId: string) => void
  onOperationChange: (opId: string, v: string) => void
  onSaveOperation: (opId: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const [open, setOpen] = useState(false)
  const workplace = parent.workAreaName || parent.lineName || '—'
  const totalOps = parent.workers.reduce((n, w) => n + w.operations.length, 0)

  return (
    <div className="card-industrial overflow-hidden border-violet-500/20">
      <div className="border-b border-violet-500/30 bg-gradient-to-l from-violet-950/40 to-slate-950/80 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex w-full items-start gap-2 rounded-xl p-1 text-start transition hover:bg-violet-500/5"
        >
          <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-violet-300 transition-transform ${open ? '' : '-rotate-90'}`} />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-4">
            <HeaderCell label={t('settings.cols.stationName')} value={parent.displayCode || '—'} accent dir="ltr" />
            <HeaderCell label={t('operations.workplace')} value={workplace} />
            <HeaderCell label={t('operations.totalWorkers')} value={String(parent.workers.length)} />
            <HeaderCell label={t('operations.opsCount')} value={String(totalOps)} />
          </div>
        </button>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {parent.stationName}
        </p>
      </div>

      {open && (
        <div className="space-y-3 p-4">
          {parent.workers.map(worker => (
            <SopWorkerPanel
              key={worker.stationId}
              worker={worker}
              parent={parent}
              stationInstructions={workerStationInstructions[worker.stationId] ?? ''}
              operationInstructions={operationInstructions}
              canManage={canManage}
              savingWorker={savingWorkerId === worker.stationId}
              savingOpId={savingOpId}
              onStationChange={v => onWorkerInstructionsChange(worker.stationId, v)}
              onSaveStation={() => onSaveWorker(worker.stationId)}
              onOperationChange={onOperationChange}
              onSaveOperation={onSaveOperation}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SopHierarchyTab({ parentGroups, models, loading, loadError, canManage, notify }: Props) {
  const { t } = useLang()
  const [activeLine, setActiveLine] = useState<ModelLine>(MODEL_LINES[0])
  const [activeVariant, setActiveVariant] = useState('')
  const [workerDraft, setWorkerDraft] = useState<Record<string, string>>({})
  const [opDraft, setOpDraft] = useState<Record<string, string>>({})
  const [sopLoading, setSopLoading] = useState(false)
  const [savingWorkerId, setSavingWorkerId] = useState<string | null>(null)
  const [savingOpId, setSavingOpId] = useState<string | null>(null)

  const lineVariants = useMemo(() => getVariantsForLine(models, activeLine), [models, activeLine])
  const lineFamilyId = useMemo(() => familyModelIdForLine(models, activeLine), [models, activeLine])

  const filteredParents = useMemo(
    () => filterParentGroupsByLine(parentGroups, activeLine, activeVariant, lineVariants, lineFamilyId),
    [parentGroups, activeLine, activeVariant, lineVariants, lineFamilyId]
  )

  const stats = useMemo(() => {
    const workers = filteredParents.reduce((n, p) => n + p.workers.length, 0)
    const ops = filteredParents.reduce((n, p) => n + p.workers.reduce((s, w) => s + w.operations.length, 0), 0)
    return { parents: filteredParents.length, workers, ops }
  }, [filteredParents])

  useEffect(() => {
    if (!lineFamilyId) {
      setWorkerDraft({})
      setOpDraft({})
      return
    }
    let cancelled = false
    setSopLoading(true)
    getSopForFamily(lineFamilyId)
      .then(bundle => {
        if (cancelled) return
        const w: Record<string, string> = {}
        for (const row of bundle.workers) w[row.workerStationId] = row.stationInstructions
        const o: Record<string, string> = {}
        for (const row of bundle.operations) o[row.operationId] = row.instructions
        setWorkerDraft(w)
        setOpDraft(o)
      })
      .catch(err => {
        if (!cancelled) notify(err instanceof Error ? err.message : t('common.error'), true)
      })
      .finally(() => {
        if (!cancelled) setSopLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lineFamilyId, notify, t])

  async function saveWorker(workerStationId: string) {
    if (!lineFamilyId || !canManage) return
    setSavingWorkerId(workerStationId)
    try {
      await upsertWorkerSop(workerStationId, lineFamilyId, workerDraft[workerStationId] ?? '')
      notify(t('sop.saved'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setSavingWorkerId(null)
    }
  }

  async function saveOperation(operationId: string) {
    if (!canManage) return
    setSavingOpId(operationId)
    try {
      await upsertOperationSop(operationId, opDraft[operationId] ?? '')
      notify(t('sop.saved'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setSavingOpId(null)
    }
  }

  if (loading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (loadError) {
    return <div className="card-industrial p-6 text-sm text-red-300">{loadError}</div>
  }

  return (
    <div className="space-y-4">
      <StationOperationsLineFilter
        activeLine={activeLine}
        lineVariants={lineVariants}
        activeVariant={activeVariant}
        onSelectLine={line => {
          setActiveLine(line)
          setActiveVariant('')
        }}
        onSelectVariant={setActiveVariant}
        t={t}
      />

      <p className="text-center text-xs text-slate-500">
        {t('sop.countLineView', {
          stations: stats.parents,
          workers: stats.workers,
          ops: stats.ops,
          line: activeLine
        })}
        {sopLoading ? ` · ${t('common.loading')}` : ''}
      </p>

      {!lineFamilyId && (
        <div className="card-industrial p-6 text-center text-sm text-amber-200">{t('sop.noFamilyForLine', { line: activeLine })}</div>
      )}

      {lineFamilyId && filteredParents.length === 0 && (
        <EmptyState title={t('sop.empty')} hint={t('sop.emptyHint')} />
      )}

      {lineFamilyId &&
        filteredParents.map(parent => (
          <SopParentBlock
            key={parent.stationNumber}
            parent={parent}
            workerStationInstructions={workerDraft}
            operationInstructions={opDraft}
            canManage={canManage}
            savingWorkerId={savingWorkerId}
            savingOpId={savingOpId}
            onWorkerInstructionsChange={(workerId, v) => setWorkerDraft(prev => ({ ...prev, [workerId]: v }))}
            onSaveWorker={saveWorker}
            onOperationChange={(opId, v) => setOpDraft(prev => ({ ...prev, [opId]: v }))}
            onSaveOperation={saveOperation}
            t={t}
          />
        ))}

      {!canManage && <p className="text-center text-xs text-amber-300">{t('sop.readOnly')}</p>}
    </div>
  )
}
