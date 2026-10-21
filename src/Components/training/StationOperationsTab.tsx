import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { EmptyState } from '../EmptyState'
import { StationWizardModal } from '../StationWizardModal'
import { StationOperationForm } from './StationOperationForm'
import { MoveOperationModal } from './MoveOperationModal'
import {
  assignIplPartToWorkerLine,
  createStationOperation,
  deactivateStationOperation,
  deactivateStationWithWorkers,
  ensureFirstWorkerLine,
  syncWorkerLinesToHeadcount,
  updateStationOperation
} from '../../services/stationOperationsService'
import { deactivateStation, getStations, getWorkAreas, updateStation } from '../../services/settingsService'
import {
  countEmployeeLevelsForStation,
  countEmployeeLevelsOnTracks,
  deleteEmployeeLevelsAboveTrack,
  deleteEmployeeLevelsForStation,
  deleteEmployeeLevelsOnTracks
} from '../../services/employeeStationLevelService'
import {
  masterStationCode,
  filterMasterReferenceStations,
  resolveMasterStationRecord,
  countWorkerLines
} from '../../Utils/stationMaster'
import {
  normalizeStationReferenceCode,
  composeStationNumber,
  parseStationNumberParts,
  formatStationWorkerDisplayCode,
  workerIndexFromStationCode
} from '../../Utils/stationHierarchy'
import { MODEL_LINES, MODEL_LINE_STYLES, modelBelongsToLine, type ModelLine } from '../../Utils/modelLines'
import { defaultIplCompareModelNames, selectableVehicleModels } from '../../Utils/vehicleModelHierarchy'
import { IplModelTabsBar } from '../bom/IplModelTabsBar'
import {
  emptyStationWizardValues,
  parseHeadcountWorkers,
  resolveEditStationId,
  stationToWizardValues,
  type StationWizardValues
} from '../../Utils/stationFormValues'
import type { ParentStationOperationsGroup, StationOperationDetail } from '../../Types/timeStudy'
import type { Station, VehicleModel, WorkArea } from '../../Types/settings'
import { normalizeStationType } from '../../Utils/stationDisplay'
import { iplStationKey } from '../../Utils/iplStationParts'
import { isJwtExpiredMessage } from '../../services/authService'
import { useStationOpsCompareData } from '../../hooks/useStationOpsCompareData'
import { filterParentsForSelectedModels } from '../../Utils/stationOpsParentFilter'
import { ParentStationBlock } from './stationOperations/StationOperationsParentBlock'

type Props = {
  parentGroups: ParentStationOperationsGroup[]
  models: VehicleModel[]
  loading: boolean
  loadError: string
  canManage: boolean
  onReload: (options?: { silent?: boolean }) => Promise<void>
  onWorkerSummarySaved: (stationId: string, summary: string) => void
  notify: (msg: string, isError?: boolean) => void
}

type DeleteTarget =
  | { kind: 'parent'; parentId: string; workerIds: string[]; label: string; trainingCount: number }
  | {
      kind: 'worker'
      workerId: string
      masterStationId: string | null
      levelTrack: number | null
      label: string
      trainingCount: number
    }
  | { kind: 'operation'; operationId: string; label: string }

type HeadcountWarn = {
  values: StationWizardValues
  stationId: string
  newHeadcount: number
  total: number
  tracksLabel: string
}

export function StationOperationsTab({
  parentGroups,
  models,
  loading,
  loadError,
  canManage,
  onReload,
  onWorkerSummarySaved,
  notify
}: Props) {
  const { t } = useLang()
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const didInitTabs = useRef(false)
  const [editingOp, setEditingOp] = useState<StationOperationDetail | null>(null)
  const [creatingOpContext, setCreatingOpContext] = useState<{ stationId: string; label: string } | null>(null)
  const [addParentOpen, setAddParentOpen] = useState(false)
  const [editParent, setEditParent] = useState<ParentStationOperationsGroup | null>(null)
  const [allStations, setAllStations] = useState<Station[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [headcountWarn, setHeadcountWarn] = useState<HeadcountWarn | null>(null)
  const [moveOp, setMoveOp] = useState<{ op: StationOperationDetail; workerStationId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const stationNumbers = useMemo(() => allStations.map(s => s.station_number), [allStations])

  useEffect(() => {
    let cancelled = false
    Promise.all([getStations(), getWorkAreas()])
      .then(([st, areas]) => {
        if (cancelled) return
        setAllStations(st)
        setWorkAreas(areas)
      })
      .catch(() => {
        if (cancelled) return
        setAllStations([])
        setWorkAreas([])
      })
    return () => {
      cancelled = true
    }
  }, [])

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
          const { changed } = await syncWorkerLinesToHeadcount(master, target)
          if (changed) needsReload = true
        } catch {
          // retry on next refresh
        }
      }
      if (needsReload && !cancelled) await onReload({ silent: true })
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

  function resolveParentDeleteIds(
    parent: ParentStationOperationsGroup
  ): { parentId: string; workerIds: string[] } | null {
    const workerIds = parent.workers.map(w => w.stationId).filter(Boolean) as string[]
    const parentId = parent.stationId ?? resolveEditStationId(parent) ?? workerIds[0] ?? null
    if (!parentId) return null
    return { parentId, workerIds: workerIds.filter(id => id !== parentId) }
  }

  /** Always silent after mutations so the list stays mounted and scroll position is kept. */
  async function reload() {
    await onReload({ silent: true })
  }

  async function applyEditParentStation(
    values: StationWizardValues,
    options?: { clearTrainingAbove?: number }
  ): Promise<boolean> {
    if (!editParent) return false
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
    if (options?.clearTrainingAbove != null) {
      await deleteEmployeeLevelsAboveTrack(id, options.clearTrainingAbove)
    }
    const freshStation = stations.find(s => s.id === id) ?? station
    if (freshStation) {
      try {
        await syncWorkerLinesToHeadcount(
          { ...freshStation, ...patch, id },
          patch.headcount_workers
        )
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
    setHeadcountWarn(null)
    notify(t('settings.updated'))
    return true
  }

  const assignableModels = useMemo(() => selectableVehicleModels(models), [models])
  const selectedModels = useMemo(
    () => assignableModels.filter(model => openTabs.includes(model.name)),
    [assignableModels, openTabs]
  )
  const fitModelNames = useMemo(() => selectedModels.map(model => model.name), [selectedModels])
  const singleModel = selectedModels.length === 1 ? selectedModels[0] : null
  const activeVariant = singleModel?.name ?? ''
  const selectedVariantId = singleModel?.id ?? null
  const activeLine = useMemo(() => {
    const name = selectedModels[0]?.name ?? ''
    return MODEL_LINES.find(line => name && modelBelongsToLine(name, line)) ?? MODEL_LINES[0]
  }, [selectedModels])
  const { bomByPartId, hardwareBomRows, iplByStation } = useStationOpsCompareData(parentGroups, activeVariant)

  useEffect(() => {
    if (assignableModels.length === 0 || didInitTabs.current) return
    didInitTabs.current = true
    const defaults = defaultIplCompareModelNames(models, assignableModels)
    setOpenTabs(defaults.length > 0 ? defaults : assignableModels.map(model => model.name))
  }, [assignableModels, models])

  function toggleModelTab(name: string) {
    setOpenTabs(prev => (prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name].sort((a, b) => a.localeCompare(b))))
  }

  function toggleFamilyTabs(variantNames: string[]) {
    setOpenTabs(prev => {
      const allOn = variantNames.length > 0 && variantNames.every(name => prev.includes(name))
      return allOn
        ? prev.filter(name => !variantNames.includes(name))
        : [...new Set([...prev, ...variantNames])].sort((a, b) => a.localeCompare(b))
    })
  }

  const filteredParents = useMemo(
    () => filterParentsForSelectedModels(parentGroups, selectedModels),
    [parentGroups, selectedModels]
  )

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

  // Only block the UI on the first load — refreshes must stay silent so edit/delete don't jump to top.
  if (loading && parentGroups.length === 0) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (loadError) {
    const sessionExpired = isJwtExpiredMessage(loadError)
    return (
      <div className="card-industrial p-6 text-sm text-red-300">
        {loadError}
        {sessionExpired ? (
          <button
            type="button"
            onClick={() => void onReload()}
            className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
          >
            {t('permissions.retryLoad')}
          </button>
        ) : (
          <p className="mt-2 text-xs text-slate-500">{t('operations.schemaHint')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <IplModelTabsBar
          models={assignableModels}
          allModels={models}
          openTabs={openTabs}
          onToggleModel={toggleModelTab}
          onToggleFamily={toggleFamilyTabs}
        />
      </div>

      <div className="card-industrial flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className={`text-lg font-black ${MODEL_LINE_STYLES[activeLine].titleText}`}>
            {singleModel
              ? t('operations.modelPageTitle', { model: singleModel.name })
              : t('operations.modelsPageTitle', { n: selectedModels.length })}
          </h3>
          <p className="text-xs text-slate-500">
            {singleModel
              ? t('operations.variantPageHint', { line: activeLine, variant: singleModel.name })
              : selectedModels.length > 0
                ? t('operations.modelsPageHint')
                : t('operations.pickModels')}
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
            iplParts={
              activeVariant
                ? iplByStation[iplStationKey(parent.displayCode)] ??
                  iplByStation[iplStationKey(parent.stationNumber)] ??
                  []
                : undefined
            }
            onEditParent={() => setEditParent(parent)}
            onDeleteParent={() => {
              const ids = resolveParentDeleteIds(parent)
              if (!ids) {
                notify(t('operations.noParentStationId'), true)
                return
              }
              void (async () => {
                let trainingCount = 0
                try {
                  trainingCount = await countEmployeeLevelsForStation(ids.parentId)
                } catch {
                  trainingCount = 0
                }
                const baseLabel = parent.stationName || parent.displayCode
                setDeleteTarget({
                  kind: 'parent',
                  parentId: ids.parentId,
                  workerIds: ids.workerIds,
                  trainingCount,
                  label:
                    trainingCount > 0
                      ? `${baseLabel}\n\n${t('operations.trainingLevelsOnStationWarn', { n: trainingCount })}`
                      : baseLabel
                })
              })()
            }}
            onAddOp={worker => {
              if (!selectedVariantId) {
                notify(t('operations.pickOneModel'), true)
                return
              }
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
            onDeleteWorker={worker => {
              void (async () => {
                const master = resolveMasterStation(parent)
                const levelTrack = workerIndexFromStationCode(worker.stationNumber)
                let trainingCount = 0
                if (master && levelTrack != null) {
                  try {
                    trainingCount = (
                      await countEmployeeLevelsOnTracks(master.id, [levelTrack])
                    ).total
                  } catch {
                    trainingCount = 0
                  }
                }
                const trackLabel = levelTrack != null ? `L${levelTrack}` : worker.displayCode
                setDeleteTarget({
                  kind: 'worker',
                  workerId: worker.stationId,
                  masterStationId: master?.id ?? null,
                  levelTrack,
                  trainingCount,
                  label:
                    trainingCount > 0
                      ? `${worker.displayCode}\n\n${t('operations.trainingLevelsOnTrackWarn', {
                          n: trainingCount,
                          track: trackLabel
                        })}`
                      : worker.displayCode
                })
              })()
            }}
            onSummarySaved={onWorkerSummarySaved}
            compareModels={fitModelNames}
            bomByPartId={bomByPartId}
            hardwareBomRows={hardwareBomRows}
            onAssignIplPart={async (part, workerStationId) => {
              if (!selectedVariantId) {
                notify(t('operations.pickOneModel'), true)
                return
              }
              try {
                await assignIplPartToWorkerLine({
                  part,
                  workerStationId,
                  parentModelId: selectedVariantId,
                  operationType: activeVariant || 'common',
                  operations: parent.workers.flatMap(worker => worker.operations)
                })
                await reload()
              } catch (e) {
                const message = e instanceof Error ? e.message : t('common.error')
                notify(message === 'OPERATION_NAME_EXISTS_ON_TARGET' ? t('operations.moveDuplicate') : message, true)
              }
            }}
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
            const oldHeadcount =
              station?.headcount_workers ??
              editParent.headcountWorkersOverride ??
              editParent.totalWorkers ??
              0
            const newHeadcount = parseHeadcountWorkers(values.headcount_workers) ?? 0
            if (newHeadcount > 0 && oldHeadcount > newHeadcount) {
              const removedTracks = Array.from(
                { length: oldHeadcount - newHeadcount },
                (_, i) => newHeadcount + 1 + i
              )
              const { total, byTrack } = await countEmployeeLevelsOnTracks(id, removedTracks)
              if (total > 0) {
                setHeadcountWarn({
                  values,
                  stationId: id,
                  newHeadcount,
                  total,
                  tracksLabel: byTrack.map(row => `L${row.track} (${row.count})`).join(' · ')
                })
                return false
              }
            }
            return await applyEditParentStation(values)
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
              parentModelId: creatingOpContext
                ? selectedVariantId ?? input.parentModelId
                : editingOp?.parentModelId ?? input.parentModelId
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
                if (
                  deleteTarget.trainingCount > 0 &&
                  deleteTarget.masterStationId &&
                  deleteTarget.levelTrack != null
                ) {
                  await deleteEmployeeLevelsOnTracks(deleteTarget.masterStationId, [
                    deleteTarget.levelTrack
                  ])
                }
                await deactivateStation(deleteTarget.workerId)
              } else {
                if (deleteTarget.trainingCount > 0) {
                  await deleteEmployeeLevelsForStation(deleteTarget.parentId)
                }
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

      <ConfirmDialog
        open={Boolean(headcountWarn)}
        title={t('operations.trainingLevelsHeadcountTitle')}
        message={
          headcountWarn
            ? t('operations.trainingLevelsHeadcountWarn', {
                n: headcountWarn.total,
                tracks: headcountWarn.tracksLabel,
                count: headcountWarn.newHeadcount
              })
            : ''
        }
        confirmLabel={t('operations.trainingLevelsHeadcountConfirm')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onCancel={() => setHeadcountWarn(null)}
        onConfirm={() => {
          if (!headcountWarn) return
          void (async () => {
            setBusy(true)
            try {
              await applyEditParentStation(headcountWarn.values, {
                clearTrainingAbove: headcountWarn.newHeadcount
              })
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
