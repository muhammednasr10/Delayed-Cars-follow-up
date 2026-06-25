import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MapPin, Pencil, Plus, Trash2, Users, ChevronDown } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { EmptyState } from '../EmptyState'
import { StationWizardModal } from '../StationWizardModal'
import { StationOperationForm } from './StationOperationForm'
import { MoveOperationModal } from './MoveOperationModal'
import { OperationsDataTable, flattenOperationRows } from './OperationsDataTable'
import {
  createStationOperation,
  deactivateStationOperation,
  deactivateStationWithWorkers,
  ensureFirstWorkerLine,
  syncWorkerLinesToHeadcount,
  updateStationOperation
} from '../../services/stationOperationsService'
import { deactivateStation, getStations, getWorkAreas, updateStation } from '../../services/settingsService'
import { masterStationCode, filterMasterReferenceStations, resolveMasterStationRecord, countWorkerLines } from '../../Utils/stationMaster'
import { normalizeStationReferenceCode, composeStationNumber, parseStationNumberParts, formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import {
  MODEL_LINES,
  MODEL_LINE_STYLES,
  type ModelLine
} from '../../Utils/modelLines'
import { classificationAppliesToVariant, getPresetsForLine, getVariantsForLine } from '../../Utils/lineClassifications'
import { familyModelIdForLine } from '../../Utils/operationClassificationBuilder'
import { operationMatchesLineFilter } from '../../Utils/operationClassification'
import {
  emptyStationWizardValues,
  parseHeadcountWorkers,
  resolveEditStationId,
  stationToWizardValues
} from '../../Utils/stationFormValues'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../Types/timeStudy'
import type { Station, VehicleModel, WorkArea } from '../../Types/settings'
import { normalizeStationType } from '../../Utils/stationDisplay'

type Props = {
  parentGroups: ParentStationOperationsGroup[]
  models: VehicleModel[]
  loading: boolean
  loadError: string
  canManage: boolean
  onReload: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

type DeleteTarget =
  | { kind: 'parent'; parentId: string; workerIds: string[]; label: string }
  | { kind: 'worker'; workerId: string; label: string }
  | { kind: 'operation'; operationId: string; label: string }

export function StationOperationsTab({
  parentGroups,
  models,
  loading,
  loadError,
  canManage,
  onReload,
  notify
}: Props) {
  const { t } = useLang()
  const [activeLine, setActiveLine] = useState<ModelLine>(MODEL_LINES[0])
  const [activeVariant, setActiveVariant] = useState('')
  const [editingOp, setEditingOp] = useState<StationOperationDetail | null>(null)
  const [creatingOpContext, setCreatingOpContext] = useState<{ stationId: string; label: string } | null>(null)
  const [addParentOpen, setAddParentOpen] = useState(false)
  const [editParent, setEditParent] = useState<ParentStationOperationsGroup | null>(null)
  const [allStations, setAllStations] = useState<Station[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [moveOp, setMoveOp] = useState<{ op: StationOperationDetail; workerStationId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const stationNumbers = useMemo(() => allStations.map(s => s.station_number), [allStations])

  useEffect(() => {
    Promise.all([getStations(), getWorkAreas()])
      .then(([st, areas]) => {
        setAllStations(st)
        setWorkAreas(areas)
      })
      .catch(() => {
        setAllStations([])
        setWorkAreas([])
      })
  }, [parentGroups])

  useEffect(() => {
    if (!canManage || allStations.length === 0) return
    let cancelled = false
    void (async () => {
      let needsReload = false
      for (const parent of parentGroups) {
        const target = parent.headcountWorkersOverride ?? parent.totalWorkers ?? 0
        if (target < 1 || countWorkerLines(parent) >= target) continue
        const master = resolveMasterStationRecord(parent, allStations)
        if (!master) continue
        try {
          await syncWorkerLinesToHeadcount(master, target)
          needsReload = true
        } catch {
          // retry on next parentGroups refresh
        }
      }
      if (needsReload && !cancelled) await reload()
    })()
    return () => {
      cancelled = true
    }
  }, [parentGroups, allStations, canManage])

  const linkedMasterCodes = useMemo(
    () => parentGroups.map(p => masterStationCode({ station_number: p.stationNumber }).toUpperCase()),
    [parentGroups]
  )

  const masterStationsAvailable = useMemo(
    () =>
      filterMasterReferenceStations(allStations).filter(
        s => !linkedMasterCodes.includes(masterStationCode(s).toUpperCase())
      ),
    [allStations, linkedMasterCodes]
  )

  const allMasterStations = useMemo(() => filterMasterReferenceStations(allStations), [allStations])

  const editParentWizardValues = useMemo(() => {
    if (!editParent) return emptyStationWizardValues()
    const station = resolveMasterStationRecord(editParent, allStations)
    return station ? stationToWizardValues(station) : emptyStationWizardValues()
  }, [editParent, allStations])

  const editParentExcludeNumbers = useMemo(() => {
    if (!editParent) return [] as string[]
    const nums = new Set<string>()
    if (editParent.stationNumber) nums.add(editParent.stationNumber)
    for (const worker of editParent.workers) {
      if (worker.stationNumber) nums.add(worker.stationNumber)
      if (worker.displayCode) nums.add(worker.displayCode)
    }
    const master = resolveMasterStationRecord(editParent, allStations)
    if (master?.station_number) nums.add(master.station_number)
    return [...nums]
  }, [editParent, allStations])

  function resolveMasterStation(parent: ParentStationOperationsGroup): Station | null {
    return resolveMasterStationRecord(parent, allStations)
  }

  function resolveParentDeleteIds(parent: ParentStationOperationsGroup): { parentId: string; workerIds: string[] } | null {
    const workerIds = parent.workers.map(w => w.stationId).filter(Boolean) as string[]
    const parentId = parent.stationId ?? resolveEditStationId(parent) ?? workerIds[0] ?? null
    if (!parentId) return null
    return { parentId, workerIds: workerIds.filter(id => id !== parentId) }
  }

  async function reload() {
    await onReload()
  }

  const lineVariants = useMemo(
    () => getVariantsForLine(models, activeLine),
    [models, activeLine]
  )

  const lineFamilyId = useMemo(
    () => familyModelIdForLine(models, activeLine),
    [models, activeLine]
  )

  const filteredParents = useMemo(() => {
    return parentGroups
      .map(p => ({
        ...p,
        workers: p.workers.map(w => ({
          ...w,
          operations: w.operations.filter(op => {
            if (lineFamilyId && op.parentModelId && op.parentModelId !== lineFamilyId) return false
            return operationMatchesLineFilter(op.operationType, activeLine, activeVariant, lineVariants)
          })
        }))
      }))
      .filter(p => p.workers.length > 0)
  }, [parentGroups, activeLine, activeVariant, lineVariants, lineFamilyId])

  const stats = useMemo(() => {
    const workers = filteredParents.reduce((n, p) => n + p.workers.length, 0)
    const ops = filteredParents.reduce((n, p) => n + p.workers.reduce((s, w) => s + w.operations.length, 0), 0)
    return { parents: filteredParents.length, workers, ops }
  }, [filteredParents])

  const operationFormStationId = editingOp?.stationId ?? creatingOpContext?.stationId ?? null

  const operationFormPredecessors = useMemo(() => {
    const excludeId = editingOp?.id
    const list: {
      id: string
      label: string
      subtitle: string
      timeSeconds: number | null
      timeMinutes: number | null
      sortKey: string
    }[] = []

    for (const parent of parentGroups) {
      for (const worker of parent.workers) {
        const workerCode = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
        for (const op of worker.operations) {
          if (op.id === excludeId) continue
          list.push({
            id: op.id,
            label: op.operationNameAr,
            subtitle: `${parent.displayCode} · ${workerCode}`,
            timeSeconds: op.standardTimeSeconds,
            timeMinutes: op.standardTimeMinutes,
            sortKey: `${parent.sortOrder}-${worker.sortOrder}-${op.sequenceNo}-${op.operationNameAr}`
          })
        }
      }
    }

    return list
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey: _s, ...rest }) => rest)
  }, [parentGroups, editingOp?.id])

  function selectLine(line: ModelLine) {
    setActiveLine(line)
    setActiveVariant('')
  }

  if (loading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (loadError) {
    return (
      <div className="card-industrial p-6 text-sm text-red-300">
        {loadError}
        <p className="mt-2 text-xs text-slate-500">{t('operations.schemaHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t('operations.modelPages')}</p>
        <div className="flex flex-wrap gap-2">
          {MODEL_LINES.map(line => (
            <ModelTab
              key={line}
              active={activeLine === line}
              label={line}
              style={MODEL_LINE_STYLES[line]}
              onClick={() => selectLine(line)}
            />
          ))}
        </div>
        {lineVariants.length > 0 && (
          <VariantFilter
            line={activeLine}
            variants={lineVariants}
            activeVariant={activeVariant}
            onSelect={setActiveVariant}
            t={t}
          />
        )}
        {lineVariants.length >= 3 && (
          <ClassificationLegend line={activeLine} t={t} />
        )}
      </div>

      <div className="card-industrial flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className={`text-lg font-black ${MODEL_LINE_STYLES[activeLine].titleText}`}>
            {t('operations.modelPageTitle', { model: activeLine })}
          </h3>
          <p className="text-xs text-slate-500">
            {activeVariant
              ? t('operations.variantPageHint', { line: activeLine, variant: activeVariant })
              : t('operations.modelPageFullCopy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">
            {t('operations.countLineView', {
              stations: stats.parents,
              workers: stats.workers,
              ops: stats.ops,
              lineOps: stats.ops,
              line: activeLine
            })}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => setAddParentOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              {t('operations.addParentStation')}
            </button>
          )}
        </div>
      </div>

      {filteredParents.length === 0 ? (
        <EmptyState title={t('training.empty')} hint={t('operations.emptyHint')} />
      ) : (
        filteredParents.map(parent => (
          <ParentStationBlock
            key={`${parent.stationNumber}-${parent.stationId ?? 'v'}`}
            parent={parent}
            contextLine={activeLine}
            canManage={canManage}
            onEditParent={() => setEditParent(parent)}
            onDeleteParent={() => {
              const ids = resolveParentDeleteIds(parent)
              if (!ids) {
                notify(t('operations.noParentStationId'), true)
                return
              }
              setDeleteTarget({
                kind: 'parent',
                parentId: ids.parentId,
                workerIds: ids.workerIds,
                label: parent.stationName || parent.displayCode
              })
            }}
            onAddOp={worker => {
              void (async () => {
                let stationId = worker.stationId
                let label = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
                const master = resolveMasterStation(parent)
                if (master && !/-L\d+$/i.test(worker.stationNumber)) {
                  try {
                    setBusy(true)
                    const line = await ensureFirstWorkerLine(master)
                    stationId = line.id
                    label = formatStationWorkerDisplayCode(line.station_number)
                    await reload()
                    const fresh = await getStations()
                    setAllStations(fresh)
                  } catch (e) {
                    notify(e instanceof Error ? e.message : t('common.error'), true)
                  } finally {
                    setBusy(false)
                  }
                }
                setCreatingOpContext({ stationId, label })
              })()
            }}
            onEditOp={setEditingOp}
            onDeleteOp={op =>
              setDeleteTarget({ kind: 'operation', operationId: op.id, label: op.operationNameAr })
            }
            onMoveOp={(op, workerStationId) => setMoveOp({ op, workerStationId })}
            onDeleteWorker={worker =>
              setDeleteTarget({ kind: 'worker', workerId: worker.stationId, label: worker.displayCode })
            }
            t={t}
          />
        ))
      )}

      <StationWizardModal
        open={addParentOpen}
        mode="create"
        initialValues={emptyStationWizardValues()}
        existingStationNumbers={stationNumbers}
        workAreas={workAreas}
        masterStations={masterStationsAvailable}
        linkFromSettingsOnly
        busy={busy}
        onClose={() => setAddParentOpen(false)}
        onSubmit={async values => {
          const base = normalizeStationReferenceCode(values.station_number || values.station_base).toUpperCase()
          const station = allStations.find(s => masterStationCode(s).toUpperCase() === base)
          if (!station) {
            notify(t('operations.stationMustFromSettings'), true)
            return false
          }
          setBusy(true)
          try {
            await updateStation(station.id, {
              station_number: values.station_number,
              station_name: values.station_name,
              station_type: normalizeStationType(values.station_type),
              sort_order: values.sort_order ? Number(values.sort_order) : 0,
              work_area_id: values.work_area_id || null,
              is_active: values.is_active !== 'false',
              headcount_workers: parseHeadcountWorkers(values.headcount_workers)
            })
            const freshStation = (await getStations()).find(s => s.id === station.id) ?? station
            await syncWorkerLinesToHeadcount(
              freshStation,
              parseHeadcountWorkers(values.headcount_workers)
            )
            await reload()
            const fresh = await getStations()
            setAllStations(fresh)
            setAddParentOpen(false)
            notify(t('operations.stationLinked'))
            return true
          } catch (e) {
            notify(e instanceof Error ? e.message : t('common.error'), true)
            return false
          } finally {
            setBusy(false)
          }
        }}
      />

      <StationWizardModal
        open={Boolean(editParent)}
        mode="edit"
        initialValues={editParentWizardValues}
        existingStationNumbers={stationNumbers}
        excludeStationNumbers={editParentExcludeNumbers}
        workAreas={workAreas}
        masterStations={allMasterStations}
        busy={busy}
        onClose={() => setEditParent(null)}
        onSubmit={async values => {
          if (!editParent) return false
          setBusy(true)
          try {
            const stations = await getStations()
            const station = resolveMasterStationRecord(editParent, stations)
            const id = station?.id ?? editParent.stationId ?? resolveEditStationId(editParent)
            if (!id) {
              notify(t('operations.noParentStationId'), true)
              return false
            }
            const oldBase = normalizeStationReferenceCode(
              station?.station_number ?? editParent.stationNumber
            )
            const patch = {
              station_number: values.station_number,
              station_name: values.station_name,
              station_type: normalizeStationType(values.station_type),
              sort_order: values.sort_order ? Number(values.sort_order) : 0,
              work_area_id: values.work_area_id || null,
              is_active: values.is_active !== 'false',
              headcount_workers: parseHeadcountWorkers(values.headcount_workers)
            }
            await updateStation(id, patch)
            const freshStation = stations.find(s => s.id === id) ?? station
            if (freshStation) {
              try {
                await syncWorkerLinesToHeadcount(freshStation, patch.headcount_workers)
              } catch (syncErr) {
                notify(
                  syncErr instanceof Error ? syncErr.message : t('operations.workerLinesSyncFailed'),
                  true
                )
              }
            }
            const newBase = normalizeStationReferenceCode(values.station_number || values.station_base)
            if (newBase !== oldBase) {
              for (const worker of editParent.workers) {
                if (!worker.stationId || worker.stationId === id) continue
                const { base, workerSuffix } = parseStationNumberParts(worker.stationNumber)
                if (normalizeStationReferenceCode(base) !== oldBase) continue
                const station_number = workerSuffix
                  ? composeStationNumber(newBase, workerSuffix)
                  : newBase
                await updateStation(worker.stationId, { station_number })
              }
            }
            await reload()
            const fresh = await getStations()
            setAllStations(fresh)
            setEditParent(null)
            notify(t('settings.updated'))
            return true
          } catch (e) {
            notify(e instanceof Error ? e.message : t('common.error'), true)
            return false
          } finally {
            setBusy(false)
          }
        }}
      />

      <StationOperationForm
        open={Boolean(editingOp) || Boolean(creatingOpContext)}
        mode={creatingOpContext ? 'create' : 'edit'}
        operation={editingOp}
        models={models}
        modelLine={activeLine}
        stationId={operationFormStationId}
        predecessorCandidates={operationFormPredecessors}
        workerLabel={creatingOpContext?.label ?? null}
        busy={busy}
        onClose={() => {
          setEditingOp(null)
          setCreatingOpContext(null)
        }}
        onSubmit={async input => {
          setBusy(true)
          try {
            const payload = {
              ...input,
              parentModelId: lineFamilyId ?? input.parentModelId
            }
            if (creatingOpContext) {
              await createStationOperation(creatingOpContext.stationId, payload)
              setCreatingOpContext(null)
              notify(t('settings.added'))
            } else if (editingOp) {
              await updateStationOperation(editingOp.id, payload)
              setEditingOp(null)
              notify(t('settings.updated'))
            }
            await reload()
          } catch (e) {
            notify(e instanceof Error ? e.message : t('common.error'), true)
          } finally {
            setBusy(false)
          }
        }}
      />

      <MoveOperationModal
        open={Boolean(moveOp)}
        operation={moveOp?.op ?? null}
        currentWorkerStationId={moveOp?.workerStationId ?? ''}
        parentGroups={parentGroups}
        busy={busy}
        onClose={() => setMoveOp(null)}
        onError={msg => notify(msg, true)}
        onMoved={async () => {
          setBusy(true)
          try {
            await reload()
            notify(t('operations.moveDone'))
          } finally {
            setBusy(false)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('operations.confirmDelete')}
        message={deleteTarget?.label ?? ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          void (async () => {
            setBusy(true)
            try {
              if (deleteTarget.kind === 'operation') {
                await deactivateStationOperation(deleteTarget.operationId)
              } else if (deleteTarget.kind === 'worker') {
                await deactivateStation(deleteTarget.workerId)
              } else {
                await deactivateStationWithWorkers(deleteTarget.parentId, deleteTarget.workerIds)
              }
              setDeleteTarget(null)
              await reload()
              notify(t('settings.deleted'))
            } catch (e) {
              notify(e instanceof Error ? e.message : t('common.error'), true)
            } finally {
              setBusy(false)
            }
          })()
        }}
      />
    </div>
  )
}

function VariantFilter({
  line,
  variants,
  activeVariant,
  onSelect,
  t
}: {
  line: ModelLine
  variants: string[]
  activeVariant: string
  onSelect: (v: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const style = MODEL_LINE_STYLES[line]
  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('operations.variantFilter', { line })}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-black ${!activeVariant ? style.tabActive : style.tabIdle}`}
        >
          {t('operations.allVariants', { line })}
        </button>
        {variants.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-black ${activeVariant === v ? style.tabActive : style.tabIdle}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClassificationLegend({
  line,
  t
}: {
  line: ModelLine
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const presets = getPresetsForLine(line)
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('operations.classLegend', { line })}</p>
      <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map(p => (
          <li key={p.value} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModelTab({
  active,
  label,
  style,
  onClick
}: {
  active: boolean
  label: string
  style: { tabActive: string; tabIdle: string }
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-black transition ${active ? style.tabActive : style.tabIdle}`}
    >
      {label}
    </button>
  )
}

function CrudActions({
  canManage,
  onAdd,
  onEdit,
  onDelete,
  addTitle,
  editTitle,
  deleteTitle
}: {
  canManage: boolean
  onAdd?: () => void
  onEdit?: () => void
  onDelete?: () => void
  addTitle?: string
  editTitle?: string
  deleteTitle?: string
}) {
  if (!canManage) return null
  const btn = 'rounded-lg p-2 transition'
  return (
    <div className="flex flex-wrap gap-1">
      {onAdd && (
        <button type="button" title={addTitle} onClick={onAdd} className={`${btn} bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25`}>
          <Plus className="h-4 w-4" />
        </button>
      )}
      {onEdit && (
        <button type="button" title={editTitle} onClick={onEdit} className={`${btn} bg-orange-500/15 text-orange-200 hover:bg-orange-500/25`}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button type="button" title={deleteTitle} onClick={onDelete} className={`${btn} bg-red-500/15 text-red-200 hover:bg-red-500/25`}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function formatWorkerLineTime(minutes: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const text = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)
  return `${text} ${t('operations.minUnit')}`
}

function ParentStationBlock({
  parent,
  contextLine,
  canManage,
  onEditParent,
  onDeleteParent,
  onAddOp,
  onEditOp,
  onDeleteOp,
  onMoveOp,
  onDeleteWorker,
  t
}: {
  parent: ParentStationOperationsGroup
  contextLine: ModelLine | null
  canManage: boolean
  onEditParent: () => void
  onDeleteParent: () => void
  onAddOp: (worker: WorkerOperationsGroup) => void
  onEditOp: (op: StationOperationDetail) => void
  onDeleteOp: (op: StationOperationDetail) => void
  onMoveOp: (op: StationOperationDetail, workerStationId: string) => void
  onDeleteWorker: (worker: WorkerOperationsGroup) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const [open, setOpen] = useState(false)
  const workplace = parent.workAreaName || parent.lineName || '—'
  const avgText =
    parent.avgStationTimeMinutes != null
      ? `${parent.avgStationTimeMinutes.toFixed(1)}`
      : '—'
  const totalOps = parent.workers.reduce((n, w) => n + w.operations.length, 0)

  return (
    <div className="card-industrial overflow-hidden border-cyan-500/20">
      <div className="border-b border-cyan-500/30 bg-gradient-to-l from-cyan-950/40 to-slate-950/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-xl p-1 text-start transition hover:bg-cyan-500/5"
            aria-expanded={open}
          >
            <ChevronDown
              className={`mt-1 h-5 w-5 shrink-0 text-cyan-300 transition-transform ${open ? '' : '-rotate-90'}`}
            />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-5">
              <HeaderCell
                label={t('settings.cols.stationName')}
                value={parent.displayCode || '—'}
                accent
                dir="ltr"
              />
              <HeaderCell label={t('settings.cols.commonName')} value={parent.stationName || '—'} />
              <HeaderCell
                label={t('operations.workplace')}
                value={workplace}
                icon={<MapPin className="h-3.5 w-3.5 text-slate-500" />}
              />
              <HeaderCell
                label={t('operations.avgStationTime')}
                value={
                  parent.avgStationTimeMinutes != null
                    ? `${avgText} ${t('operations.minUnit')}`
                    : '—'
                }
                accent={parent.avgStationTimeMinutes != null}
                accentTone="orange"
                dir="ltr"
              />
              <HeaderCell
                label={t('operations.totalWorkers')}
                value={String(parent.totalWorkers)}
                icon={<Users className="h-3.5 w-3.5 text-slate-500" />}
              />
            </div>
          </button>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {!open && (
              <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-400">
                {totalOps} {t('operations.opsCount')}
              </span>
            )}
            <CrudActions
              canManage={canManage}
              onEdit={onEditParent}
              onDelete={onDeleteParent}
              editTitle={t('operations.editParentStation')}
              deleteTitle={t('operations.deleteParent')}
            />
          </div>
        </div>
      </div>

      {open && (
        <div className="space-y-4 p-4">
          {parent.workers.length === 0 ? (
            <p className="text-center text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            parent.workers.map(worker => (
              <WorkerOperationsPanel
                key={worker.stationId}
                worker={worker}
                parent={parent}
                contextLine={contextLine}
                canManage={canManage}
                onAddOp={onAddOp}
                onEditOp={onEditOp}
                onDeleteOp={onDeleteOp}
                onMoveOp={onMoveOp}
                onDeleteWorker={onDeleteWorker}
                t={t}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function WorkerOperationsPanel({
  worker,
  parent,
  contextLine,
  canManage,
  onAddOp,
  onEditOp,
  onDeleteOp,
  onMoveOp,
  onDeleteWorker,
  t
}: {
  worker: WorkerOperationsGroup
  parent: ParentStationOperationsGroup
  contextLine: ModelLine | null
  canManage: boolean
  onAddOp: (worker: WorkerOperationsGroup) => void
  onEditOp: (op: StationOperationDetail) => void
  onDeleteOp: (op: StationOperationDetail) => void
  onMoveOp: (op: StationOperationDetail, workerStationId: string) => void
  onDeleteWorker: (worker: WorkerOperationsGroup) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const [open, setOpen] = useState(false)
  const workerRows = flattenOperationRows(parent).filter(r => r.worker.stationId === worker.stationId)
  const workerCode = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
  const workerTimeMin = worker.totalWorkerTimeMinutes

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-start transition hover:bg-slate-800/60"
          aria-expanded={open}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <Users className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="font-mono text-sm font-black text-cyan-200" dir="ltr">
            {workerCode}
          </span>
          <span className="text-xs text-slate-500">
            {worker.operations.length} {t('operations.opsCount')}
          </span>
          <span className="hidden text-xs text-slate-600 sm:inline">·</span>
          <span className="text-xs font-bold text-orange-300" dir="ltr">
            {t('operations.workerLineTime')}: {formatWorkerLineTime(workerTimeMin, t)}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => onAddOp(worker)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('operations.addOperation')}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => onDeleteWorker(worker)}
              className="text-xs font-bold text-red-300/80 hover:text-red-200"
            >
              {t('operations.deleteWorker')}
            </button>
          )}
        </div>
      </div>
      {open && (
        <OperationsDataTable
          rows={workerRows}
          contextLine={contextLine}
          canManage={canManage}
          compact
          onEdit={onEditOp}
          onDelete={onDeleteOp}
          onMove={onMoveOp}
        />
      )}
    </div>
  )
}

function HeaderCell({
  label,
  value,
  accent,
  accentTone = 'cyan',
  icon,
  dir
}: {
  label: string
  value: string
  accent?: boolean
  accentTone?: 'cyan' | 'orange'
  icon?: ReactNode
  dir?: 'ltr' | 'rtl'
}) {
  const accentCls =
    accentTone === 'orange' ? 'text-orange-300' : 'text-cyan-300'
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 flex items-center justify-center gap-1.5 text-base font-black ${accent ? accentCls : 'text-white'} ${dir === 'ltr' ? 'font-mono' : ''}`}
        dir={dir}
      >
        {icon}
        {value}
      </p>
    </div>
  )
}
