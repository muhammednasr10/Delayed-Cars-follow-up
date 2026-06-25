import { useState } from 'react'
import { ChevronDown, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { flattenOperationRows, OperationsDataTable } from '../OperationsDataTable'
import { formatStationWorkerDisplayCode } from '../../../Utils/stationHierarchy'
import type { ModelLine } from '../../../Utils/modelLines'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../../Types/timeStudy'
import { HeaderCell } from './StationOperationsLineFilter'

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
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
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
            <button type="button" onClick={() => onDeleteWorker(worker)} className="text-xs font-bold text-red-300/80 hover:text-red-200">
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

export function ParentStationBlock({
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
  const avgText = parent.avgStationTimeMinutes != null ? `${parent.avgStationTimeMinutes.toFixed(1)}` : '—'
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
            <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-cyan-300 transition-transform ${open ? '' : '-rotate-90'}`} />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-5">
              <HeaderCell label={t('settings.cols.stationName')} value={parent.displayCode || '—'} accent dir="ltr" />
              <HeaderCell label={t('settings.cols.commonName')} value={parent.stationName || '—'} />
              <HeaderCell label={t('operations.workplace')} value={workplace} icon={<MapPin className="h-3.5 w-3.5 text-slate-500" />} />
              <HeaderCell
                label={t('operations.avgStationTime')}
                value={parent.avgStationTimeMinutes != null ? `${avgText} ${t('operations.minUnit')}` : '—'}
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
