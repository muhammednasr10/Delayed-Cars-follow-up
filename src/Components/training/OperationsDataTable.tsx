import { ArrowRightLeft, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import { formatOperationClassification } from '../../Utils/operationClassification'
import type { ModelLine } from '../../Utils/modelLines'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../Types/timeStudy'

export type OperationTableRow = {
  op: StationOperationDetail
  worker: WorkerOperationsGroup
  parent: ParentStationOperationsGroup
}

type Props = {
  rows: OperationTableRow[]
  contextLine: ModelLine | null
  canManage: boolean
  compact?: boolean
  onEdit: (op: StationOperationDetail) => void
  onDelete: (op: StationOperationDetail) => void
  onMove: (op: StationOperationDetail, workerStationId: string) => void
}

function formatHardware(op: StationOperationDetail): string {
  if (op.hardware.length === 0) return '—'
  return op.hardware
    .map(h => `${h.hardwareName}${h.hardwareQty != null ? ` ×${h.hardwareQty}` : ''}`)
    .join(' · ')
}

function formatSecInt(seconds: number | null, minutes: number | null): string {
  const sec = seconds != null && Number.isFinite(seconds) ? seconds : minutes != null ? minutes * 60 : null
  if (sec == null || !Number.isFinite(sec)) return '—'
  return String(Math.round(sec))
}

function formatMin(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2)
}

export function OperationsDataTable({ rows, contextLine, canManage, compact = false, onEdit, onDelete, onMove }: Props) {
  const { t } = useLang()

  if (rows.length === 0) {
    return <p className="p-4 text-center text-sm text-slate-500">{t('common.noData')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-center text-xs ${compact ? 'min-w-[720px]' : 'min-w-[1280px]'}`}>
        <thead className="bg-slate-950/90">
          <tr>
            {!compact && (
              <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.stationWorker')}</th>
            )}
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.operationKind')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.operation')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.classification')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.hardware')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.techPosition')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.taskPrecedence')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.rankedWeight')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.zoning')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.timeSec')}</th>
            <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.timeMin')}</th>
            {!compact && (
              <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.workerMin')}</th>
            )}
            {!compact && (
              <>
                <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.totalWorkers')}</th>
                <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.avgStationMin')}</th>
              </>
            )}
            {canManage && <th className="table-cell text-center font-black uppercase text-slate-400">{t('common.actions')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(({ op, worker, parent }) => (
            <tr key={op.id} className="bg-slate-900/30 hover:bg-slate-800/40">
              {!compact && (
                <td className="table-cell whitespace-nowrap text-center font-mono font-bold text-cyan-200" dir="ltr">
                  {formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)}
                </td>
              )}
              <td className="table-cell text-center text-slate-300">{op.toolSpec?.trim() || '—'}</td>
              <td className="table-cell min-w-[10rem] text-center font-bold text-slate-100">{op.operationNameAr}</td>
              <td className="table-cell text-center text-slate-300">
                {formatOperationClassification(op.operationType, contextLine ?? undefined)}
              </td>
              <td className="table-cell max-w-[12rem] text-center text-slate-400" title={formatHardware(op)}>
                <span className="line-clamp-2">{formatHardware(op)}</span>
              </td>
              <td className="table-cell text-center text-slate-300">{op.technicianPosition?.trim() || '—'}</td>
              <td className="table-cell text-center text-slate-300">{op.taskPrecedence?.trim() || '—'}</td>
              <td className="table-cell text-center font-mono text-slate-300" dir="ltr">
                {op.rankedPositionalWeight != null ? formatMin(op.rankedPositionalWeight) : '—'}
              </td>
              <td className="table-cell max-w-[10rem] text-center text-slate-400">{op.zoningConstraints?.trim() || '—'}</td>
              <td className="table-cell text-center font-mono text-orange-200" dir="ltr">
                {formatSecInt(op.standardTimeSeconds, op.standardTimeMinutes)}
              </td>
              <td className="table-cell text-center font-mono text-orange-200" dir="ltr">
                {formatMin(op.standardTimeMinutes)}
              </td>
              {!compact && (
                <td className="table-cell text-center font-mono text-orange-200" dir="ltr">
                  {formatMin(op.workerTimeMinutes)}
                </td>
              )}
              {!compact && (
                <>
                  <td className="table-cell text-center font-bold text-white">{parent.totalWorkers}</td>
                  <td className="table-cell text-center font-mono text-orange-200" dir="ltr">
                    {parent.avgStationTimeMinutes != null ? formatMin(parent.avgStationTimeMinutes) : '—'}
                  </td>
                </>
              )}
              {canManage && (
                <td className="table-cell whitespace-nowrap text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMove(op, worker.stationId)}
                      title={t('operations.moveOperation')}
                      className="rounded p-1.5 text-slate-400 hover:bg-violet-500/15 hover:text-violet-300"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(op)}
                      title={t('operations.editOp')}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(op)}
                      title={t('operations.deleteOperation')}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function flattenOperationRows(parent: ParentStationOperationsGroup): OperationTableRow[] {
  const rows: OperationTableRow[] = []
  for (const worker of parent.workers) {
    for (const op of worker.operations) {
      rows.push({ op, worker, parent })
    }
  }
  return rows
}
