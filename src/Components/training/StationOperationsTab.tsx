import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRightLeft, Clock, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { EmptyState } from '../EmptyState'
import { StationOperationForm } from './StationOperationForm'
import { ParentStationEditModal } from './ParentStationEditModal'
import { WorkerStationForm } from './WorkerStationForm'
import { MoveOperationModal } from './MoveOperationModal'
import {
  createStationOperation,
  deactivateStationOperation,
  deactivateStationWithWorkers,
  suggestNextWorkerCode,
  updateStationOperation
} from '../../services/stationOperationsService'
import { deactivateStation, updateStation } from '../../services/settingsService'
import { InlineEditableText } from '../InlineEditableText'
import {
  COMMON_SCOPE_STYLE,
  MODEL_LINES,
  MODEL_LINE_STYLES,
  type ModelLine
} from '../../Utils/modelLines'
import {
  classificationBadgeClass,
  formatOperationClassification,
  operationMatchesLineFilter,
  primaryModelLineScope
} from '../../Utils/operationClassification'
import { classificationAppliesToVariant, getPresetsForLine, getVariantsForLine } from '../../Utils/lineClassifications'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../Types/timeStudy'
import type { VehicleModel, WorkArea } from '../../Types/settings'

type Props = {
  parentGroups: ParentStationOperationsGroup[]
  models: VehicleModel[]
  workAreas: WorkArea[]
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
  workAreas,
  loading,
  loadError,
  canManage,
  onReload,
  notify
}: Props) {
  const { t } = useLang()
  const [activeLine, setActiveLine] = useState<ModelLine | ''>('')
  const [activeVariant, setActiveVariant] = useState('')
  const [editingOp, setEditingOp] = useState<StationOperationDetail | null>(null)
  const [creatingOpStationId, setCreatingOpStationId] = useState<string | null>(null)
  const [parentModal, setParentModal] = useState<{ mode: 'create' | 'edit'; parent: ParentStationOperationsGroup | null } | null>(null)
  const [workerModal, setWorkerModal] = useState<{ parent: ParentStationOperationsGroup; defaultCode: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [moveOp, setMoveOp] = useState<{ op: StationOperationDetail; workerStationId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    await onReload()
  }

  async function persistStationField(
    stationId: string | null,
    save: () => Promise<void>
  ): Promise<void> {
    if (!stationId) {
      notify(t('operations.noParentStationId'), true)
      return
    }
    setBusy(true)
    try {
      await save()
      await reload()
      notify(t('settings.updated'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      throw e
    } finally {
      setBusy(false)
    }
  }

  const lineVariants = useMemo(
    () => (activeLine ? getVariantsForLine(models, activeLine) : []),
    [models, activeLine]
  )

  const filteredParents = useMemo(() => {
    if (!activeLine) return parentGroups
    return parentGroups
      .map(p => ({
        ...p,
        workers: p.workers
          .map(w => ({
            ...w,
            operations: w.operations.filter(op =>
              operationMatchesLineFilter(op.operationType, activeLine, activeVariant, lineVariants)
            )
          }))
          .filter(w => w.operations.length > 0)
      }))
      .filter(p => p.workers.length > 0)
  }, [parentGroups, activeLine, activeVariant, lineVariants])

  const stats = useMemo(() => {
    const workers = filteredParents.reduce((n, p) => n + p.workers.length, 0)
    const ops = filteredParents.reduce((n, p) => n + p.workers.reduce((s, w) => s + w.operations.length, 0), 0)
    return { parents: filteredParents.length, workers, ops }
  }, [filteredParents])

  function selectLine(line: ModelLine | '') {
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
          <ModelTab
            active={!activeLine}
            label={t('operations.allModels')}
            style={COMMON_SCOPE_STYLE}
            onClick={() => selectLine('')}
          />
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
        {!activeLine && <ModelLegend t={t} />}
        {activeLine && lineVariants.length > 0 && (
          <VariantFilter
            line={activeLine}
            variants={lineVariants}
            activeVariant={activeVariant}
            onSelect={setActiveVariant}
            t={t}
          />
        )}
        {activeLine && lineVariants.length >= 3 && (
          <ClassificationLegend line={activeLine} t={t} />
        )}
      </div>

      <div className="card-industrial flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          {activeLine ? (
            <>
              <h3 className={`text-lg font-black ${MODEL_LINE_STYLES[activeLine].titleText}`}>
                {t('operations.modelPageTitle', { model: activeLine })}
              </h3>
              <p className="text-xs text-slate-500">
                {activeVariant
                  ? t('operations.variantPageHint', { line: activeLine, variant: activeVariant })
                  : t('operations.modelPageFullCopy')}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-black text-white">{t('operations.allStationsTitle')}</h3>
              <p className="text-xs text-slate-500">{t('operations.allStationsHint')}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">
          {activeLine
            ? t('operations.countLineView', {
                stations: stats.parents,
                workers: stats.workers,
                ops: stats.ops,
                lineOps: stats.ops,
                line: activeLine
              })
            : t('operations.countHierarchical', {
                  stations: stats.parents,
                  workers: stats.workers,
                  ops: stats.ops
                })}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => setParentModal({ mode: 'create', parent: null })}
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
            contextLine={activeLine || null}
            activeVariant={activeVariant}
            lineVariants={lineVariants}
            canManage={canManage}
            onEditParent={() => setParentModal({ mode: 'edit', parent })}
            onDeleteParent={() => {
              if (!parent.stationId) {
                notify(t('operations.noParentStationId'), true)
                return
              }
              setDeleteTarget({
                kind: 'parent',
                parentId: parent.stationId,
                workerIds: parent.workers.map(w => w.stationId),
                label: parent.stationName
              })
            }}
            onAddWorker={() => {
              if (!parent.stationId) {
                notify(t('operations.noParentStationId'), true)
                return
              }
              setWorkerModal({
                parent,
                defaultCode: suggestNextWorkerCode(parent.stationNumber, parent.workers)
              })
            }}
            onAddOp={stationId => setCreatingOpStationId(stationId)}
            onEditOp={setEditingOp}
            onDeleteOp={op =>
              setDeleteTarget({ kind: 'operation', operationId: op.id, label: op.operationNameAr })
            }
            onMoveOp={(op, workerStationId) => setMoveOp({ op, workerStationId })}
            onDeleteWorker={worker =>
              setDeleteTarget({ kind: 'worker', workerId: worker.stationId, label: worker.displayCode })
            }
            onPersistField={persistStationField}
            t={t}
          />
        ))
      )}

      <ParentStationEditModal
        open={Boolean(parentModal)}
        mode={parentModal?.mode ?? 'edit'}
        stationId={parentModal?.parent?.stationId ?? null}
        stationNumber={parentModal?.parent?.stationNumber ?? ''}
        stationName={parentModal?.parent?.stationName ?? ''}
        workAreaId={parentModal?.parent?.workAreaId ?? null}
        totalWorkers={parentModal?.parent?.totalWorkers ?? 0}
        avgStationTimeMinutes={parentModal?.parent?.avgStationTimeMinutes ?? null}
        workAreas={workAreas}
        busy={busy}
        onClose={() => setParentModal(null)}
        onSaved={async () => {
          setBusy(true)
          try {
            await reload()
            notify(t('settings.updated'))
          } catch (e) {
            notify(e instanceof Error ? e.message : t('common.error'), true)
            throw e
          } finally {
            setBusy(false)
          }
        }}
      />

      <WorkerStationForm
        open={Boolean(workerModal)}
        parentStationId={workerModal?.parent.stationId ?? null}
        defaultCode={workerModal?.defaultCode ?? ''}
        busy={busy}
        onClose={() => setWorkerModal(null)}
        onSaved={async () => {
          setBusy(true)
          try {
            await reload()
            notify(t('settings.added'))
          } finally {
            setBusy(false)
          }
        }}
      />

      <StationOperationForm
        open={Boolean(editingOp) || Boolean(creatingOpStationId)}
        mode={creatingOpStationId ? 'create' : 'edit'}
        operation={editingOp}
        modelLine={activeLine || null}
        busy={busy}
        onClose={() => {
          setEditingOp(null)
          setCreatingOpStationId(null)
        }}
        onSubmit={async input => {
          setBusy(true)
          try {
            if (creatingOpStationId) {
              await createStationOperation(creatingOpStationId, input)
              setCreatingOpStationId(null)
              notify(t('settings.added'))
            } else if (editingOp) {
              await updateStationOperation(editingOp.id, input)
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

function ModelLegend({ t }: { t: (key: string) => string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
      <span className="text-[10px] font-bold uppercase text-slate-500">{t('operations.colorLegend')}</span>
      {MODEL_LINES.map(line => (
        <span key={line} className="flex items-center gap-1.5 text-xs text-slate-300">
          <span className={`h-2.5 w-2.5 rounded-full ${MODEL_LINE_STYLES[line].legendDot}`} />
          {line}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className={`h-2.5 w-2.5 rounded-full ${COMMON_SCOPE_STYLE.legendDot}`} />
        common
      </span>
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
        <button type="button" title={editTitle} onClick={onEdit} className={`${btn} bg-slate-800 text-slate-300 hover:bg-slate-700`}>
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

function ParentStationBlock({
  parent,
  contextLine,
  activeVariant,
  lineVariants,
  canManage,
  onEditParent,
  onDeleteParent,
  onAddWorker,
  onAddOp,
  onEditOp,
  onDeleteOp,
  onMoveOp,
  onDeleteWorker,
  onPersistField,
  t
}: {
  parent: ParentStationOperationsGroup
  contextLine: ModelLine | null
  activeVariant: string
  lineVariants: string[]
  canManage: boolean
  onEditParent: () => void
  onDeleteParent: () => void
  onAddWorker: () => void
  onAddOp: (stationId: string) => void
  onEditOp: (op: StationOperationDetail) => void
  onDeleteOp: (op: StationOperationDetail) => void
  onMoveOp: (op: StationOperationDetail, workerStationId: string) => void
  onDeleteWorker: (worker: WorkerOperationsGroup) => void
  onPersistField: (stationId: string | null, save: () => Promise<void>) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const workplace = parent.workAreaName || parent.lineName || '—'
  const avgText =
    parent.avgStationTimeMinutes != null
      ? `${parent.avgStationTimeMinutes.toFixed(1)}`
      : '—'

  return (
    <div className="card-industrial overflow-hidden border-cyan-500/20">
      <div className="border-b border-cyan-500/30 bg-gradient-to-l from-cyan-950/40 to-slate-950/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
            <StationIdentityCell
              stationId={parent.stationId}
              stationName={parent.stationName}
              technicalCode={parent.displayCode}
              canManage={canManage}
              onPersist={onPersistField}
              t={t}
            />
            <HeaderCell label={t('operations.workplace')} value={workplace} icon={<MapPin className="h-3.5 w-3.5 text-slate-500" />} />
          </div>

          <div className="flex flex-col items-center justify-center px-2 lg:min-w-[140px] lg:px-6">
            <p className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {t('operations.avgStationTime')}
            </p>
            <p className="mt-1 text-center text-3xl font-black text-orange-300" dir="ltr">
              {avgText}
              {parent.avgStationTimeMinutes != null && (
                <span className="ms-1 text-base font-bold text-orange-200/80">{t('operations.minUnit')}</span>
              )}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-stretch gap-3 sm:items-end">
            <HeaderCell
              label={t('operations.totalWorkers')}
              value={String(parent.totalWorkers)}
              icon={<Users className="h-3.5 w-3.5 text-slate-500" />}
            />
            <CrudActions
              canManage={canManage}
              onAdd={onAddWorker}
              onEdit={onEditParent}
              onDelete={parent.stationId ? onDeleteParent : undefined}
              addTitle={t('operations.addWorker')}
              editTitle={t('operations.editParentStation')}
              deleteTitle={t('operations.deleteParent')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {parent.workers.map(worker => (
          <WorkerBlock
            key={worker.stationId}
            worker={worker}
            contextLine={contextLine}
            activeVariant={activeVariant}
            lineVariants={lineVariants}
            canManage={canManage}
            onAddOp={() => onAddOp(worker.stationId)}
            onEditOp={onEditOp}
            onDeleteOp={onDeleteOp}
            onMoveOp={op => onMoveOp(op, worker.stationId)}
            onDeleteWorker={() => onDeleteWorker(worker)}
            onPersistField={onPersistField}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function StationIdentityCell({
  stationId,
  stationName,
  technicalCode,
  canManage,
  onPersist,
  t
}: {
  stationId: string | null
  stationName: string
  technicalCode: string
  canManage: boolean
  onPersist: (stationId: string | null, save: () => Promise<void>) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const editable = canManage && Boolean(stationId)
  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-bold uppercase text-slate-500">{t('operations.workerCode')}</p>
      <InlineEditableText
        value={stationName}
        accent
        canEdit={editable}
        onSave={next =>
          onPersist(stationId, async () => {
            await updateStation(stationId!, { station_name: next })
          })
        }
      />
      <p className="mt-1 text-[10px] text-slate-600" dir="ltr">
        {technicalCode}
      </p>
    </div>
  )
}

function HeaderCell({
  label,
  value,
  accent,
  icon,
  dir
}: {
  label: string
  value: string
  accent?: boolean
  icon?: ReactNode
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 flex items-center gap-1.5 text-base font-black ${accent ? 'text-cyan-300' : 'text-white'}`} dir={dir}>
        {icon}
        {value}
      </p>
    </div>
  )
}

function WorkerBlock({
  worker,
  contextLine,
  activeVariant,
  lineVariants,
  canManage,
  onAddOp,
  onEditOp,
  onDeleteOp,
  onMoveOp,
  onDeleteWorker,
  onPersistField,
  t
}: {
  worker: WorkerOperationsGroup
  contextLine: ModelLine | null
  activeVariant: string
  lineVariants: string[]
  canManage: boolean
  onAddOp: () => void
  onEditOp: (op: StationOperationDetail) => void
  onDeleteOp: (op: StationOperationDetail) => void
  onMoveOp: (op: StationOperationDetail) => void
  onDeleteWorker: () => void
  onPersistField: (stationId: string | null, save: () => Promise<void>) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const editable = canManage

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-3 sm:p-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('operations.workerLabel')}</p>
            <InlineEditableText
              value={worker.displayCode}
              accent
              dir="ltr"
              canEdit={editable}
              onSave={next =>
                onPersistField(worker.stationId, async () => {
                  await updateStation(worker.stationId, { station_number: next })
                })
              }
            />
          </div>
          <div className="min-w-[10rem] max-w-md">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('operations.workerCode')}</p>
            <InlineEditableText
              value={worker.stationName}
              canEdit={editable}
              onSave={next =>
                onPersistField(worker.stationId, async () => {
                  await updateStation(worker.stationId, { station_name: next })
                })
              }
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('operations.workerTotalTime')}</p>
            <p className="mt-0.5 font-black text-orange-200" dir="ltr">
              {worker.totalWorkerTimeMinutes > 0
                ? `${worker.totalWorkerTimeMinutes.toFixed(1)} ${t('operations.minUnit')}`
                : '—'}
            </p>
          </div>
        </div>
        <CrudActions
          canManage={canManage}
          onAdd={onAddOp}
          onDelete={onDeleteWorker}
          addTitle={t('operations.addOperation')}
          deleteTitle={t('operations.deleteWorker')}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {worker.operations.map(op => (
          <OperationCard
            key={op.id}
            op={op}
            contextLine={contextLine}
            activeLine={contextLine}
            activeVariant={activeVariant}
            lineVariants={lineVariants}
            canManage={canManage}
            onEdit={() => onEditOp(op)}
            onDelete={() => onDeleteOp(op)}
            onMove={() => onMoveOp(op)}
          />
        ))}
      </div>
    </div>
  )
}

function OperationCard({
  op,
  contextLine,
  activeLine,
  activeVariant,
  lineVariants,
  canManage,
  onEdit,
  onDelete,
  onMove
}: {
  op: StationOperationDetail
  contextLine: ModelLine | null
  activeLine: ModelLine | null
  activeVariant: string
  lineVariants: string[]
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: () => void
}) {
  const { t } = useLang()
  const classLabel = formatOperationClassification(op.operationType, activeLine ?? contextLine ?? undefined)
  const scope = primaryModelLineScope(op.operationType)
  const lineStyle =
    scope !== 'common' && scope !== 'other' ? MODEL_LINE_STYLES[scope] : null
  const highlighted =
    Boolean(activeVariant) &&
    lineVariants.length > 0 &&
    classificationAppliesToVariant(op.operationType, activeVariant, lineVariants)
  const dimmed = false

  const cardBorder = lineStyle?.cardBorder ?? COMMON_SCOPE_STYLE.cardBorder
  const cardBg = lineStyle?.cardBg ?? COMMON_SCOPE_STYLE.cardBg
  const highlightRing =
    contextLine && scope === contextLine
      ? `ring-1 ring-offset-1 ring-offset-slate-900 ${MODEL_LINE_STYLES[contextLine].ring}`
      : ''

  const timeVal = op.standardTimeMinutes ?? op.workerTimeMinutes
  const timeText = timeVal != null ? `${timeVal.toFixed(1)} ${t('operations.minUnit')}` : '—'
  const hwHint =
    op.hardware.length > 0
      ? op.hardware.map(h => `${h.hardwareName}${h.hardwareQty != null ? ` ×${h.hardwareQty}` : ''}`).join(' · ')
      : op.operationCode

  return (
    <div
      title={hwHint}
      className={`group rounded-lg border px-2 py-1.5 transition ${cardBorder} ${cardBg} ${highlightRing} ${
        dimmed ? 'opacity-35 hover:opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold leading-relaxed text-slate-100 break-words">
          {op.operationNameAr}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-black tabular-nums text-orange-300" dir="ltr">
          {timeText}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold leading-snug ${classificationBadgeClass(classLabel, scope)}`}
        >
          {classLabel}
        </span>
        {op.isCritical && (
          <span className="rounded bg-red-500/20 px-1 py-0.5 text-[8px] font-bold text-red-300">!</span>
        )}
        {canManage && (
          <div className="ms-auto flex gap-0.5 opacity-80 group-hover:opacity-100">
            <button
              type="button"
              onClick={onMove}
              title={t('operations.moveOperation')}
              className="rounded p-1 text-slate-400 hover:bg-violet-500/15 hover:text-violet-300"
            >
              <ArrowRightLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onEdit}
              title={t('operations.editOp')}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title={t('operations.deleteOperation')}
              className="rounded p-1 text-slate-400 hover:bg-red-500/15 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
