import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { EmptyState } from '../EmptyState'
import { StationWizardModal } from '../StationWizardModal'
import { StationOperationForm } from './StationOperationForm'
import { MoveOperationModal } from './MoveOperationModal'
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
import { MODEL_LINES, MODEL_LINE_STYLES, type ModelLine } from '../../Utils/modelLines'
import { getVariantsForLine } from '../../Utils/lineClassifications'
import { familyModelIdForLine } from '../../Utils/operationClassificationBuilder'
import { operationMatchesLineFilter } from '../../Utils/operationClassification'
import {
  emptyStationWizardValues,
  parseHeadcountWorkers,
  resolveEditStationId,
  stationToWizardValues
} from '../../Utils/stationFormValues'
import type { ParentStationOperationsGroup, StationOperationDetail } from '../../Types/timeStudy'
import type { Station, VehicleModel, WorkArea } from '../../Types/settings'
import { normalizeStationType } from '../../Utils/stationDisplay'
import { StationOperationsLineFilter } from './stationOperations/StationOperationsLineFilter'
import { ParentStationBlock } from './stationOperations/StationOperationsParentBlock'

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

export function StationOperationsTab({ parentGroups, models, loading, loadError, canManage, onReload, notify }: Props) {
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
          // retry on next refresh
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
    () => filterMasterReferenceStations(allStations).filter(s => !linkedMasterCodes.includes(masterStationCode(s).toUpperCase())),
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

  const lineVariants = useMemo(() => getVariantsForLine(models, activeLine), [models, activeLine])
  const lineFamilyId = useMemo(() => familyModelIdForLine(models, activeLine), [models, activeLine])

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

    return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(({ sortKey: _s, ...rest }) => rest)
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
      <StationOperationsLineFilter
        activeLine={activeLine}
        lineVariants={lineVariants}
        activeVariant={activeVariant}
        onSelectLine={selectLine}
        onSelectVariant={setActiveVariant}
        t={t}
      />

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
                    setAllStations(await getStations())
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
            onDeleteOp={op => setDeleteTarget({ kind: 'operation', operationId: op.id, label: op.operationNameAr })}
            onMoveOp={(op, workerStationId) => setMoveOp({ op, workerStationId })}
            onDeleteWorker={worker => setDeleteTarget({ kind: 'worker', workerId: worker.stationId, label: worker.displayCode })}
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
            await syncWorkerLinesToHeadcount(freshStation, parseHeadcountWorkers(values.headcount_workers))
            await reload()
            setAllStations(await getStations())
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
            const oldBase = normalizeStationReferenceCode(station?.station_number ?? editParent.stationNumber)
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
                notify(syncErr instanceof Error ? syncErr.message : t('operations.workerLinesSyncFailed'), true)
              }
            }
            const newBase = normalizeStationReferenceCode(values.station_number || values.station_base)
            if (newBase !== oldBase) {
              for (const worker of editParent.workers) {
                if (!worker.stationId || worker.stationId === id) continue
                const { base, workerSuffix } = parseStationNumberParts(worker.stationNumber)
                if (normalizeStationReferenceCode(base) !== oldBase) continue
                const station_number = workerSuffix ? composeStationNumber(newBase, workerSuffix) : newBase
                await updateStation(worker.stationId, { station_number })
              }
            }
            await reload()
            setAllStations(await getStations())
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
            const payload = { ...input, parentModelId: lineFamilyId ?? input.parentModelId }
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
