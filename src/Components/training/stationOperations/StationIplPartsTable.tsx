import { iplPartIdFromNotes, type IplStationPart } from '../../../Utils/iplStationParts'
import { formatStationWorkerDisplayCode } from '../../../Utils/stationHierarchy'
import type { ParentStationOperationsGroup, WorkerOperationsGroup } from '../../../Types/timeStudy'

function workerLineLabel(worker: WorkerOperationsGroup): string {
  const code = worker.displayCode || worker.stationNumber
  const line = code.match(/L\d+/i)
  return line ? line[0].toUpperCase() : formatStationWorkerDisplayCode(code)
}

function assignedWorkerId(parent: ParentStationOperationsGroup, partId: string): string {
  for (const worker of parent.workers) {
    if (worker.operations.some(op => iplPartIdFromNotes(op.notes) === partId)) return worker.stationId
  }
  return ''
}

export function StationIplPartsTable({
  parent,
  parts,
  canManage,
  assigningPartId,
  onAssign,
  t
}: {
  parent: ParentStationOperationsGroup
  parts: IplStationPart[]
  canManage: boolean
  assigningPartId: string | null
  onAssign: (part: IplStationPart, workerStationId: string | null) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/40">
      <p className="px-4 pt-3 text-[11px] font-black text-cyan-200">
        {t('operations.iplStationParts', { count: parts.length })}
      </p>
      {parts.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-500">{t('operations.iplStationPartsEmpty')}</p>
      ) : parent.workers.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-500">{t('operations.noWorkerLines')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-center text-xs">
            <thead className="bg-slate-950/90">
              <tr>
                <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.part')}</th>
                <th className="table-cell text-center font-black uppercase text-slate-400">
                  {t('operations.cols.partNumber')}
                </th>
                <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.cols.partQty')}</th>
                <th className="table-cell text-center font-black uppercase text-slate-400">{t('operations.workerLine')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {parts.map(part => (
                <tr key={part.partId} className="bg-slate-900/30">
                  <td className="table-cell text-center font-bold text-slate-100">{part.partName}</td>
                  <td className="table-cell text-center font-mono font-bold text-cyan-100" dir="ltr">
                    {part.partNumber}
                  </td>
                  <td className="table-cell text-center font-mono text-slate-300" dir="ltr">
                    {part.quantity}
                  </td>
                  <td className="table-cell text-center">
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-100 disabled:opacity-50"
                      value={assignedWorkerId(parent, part.partId)}
                      disabled={!canManage || assigningPartId === part.partId}
                      onChange={event => onAssign(part, event.target.value || null)}
                    >
                      <option value="">{t('operations.lineUnassigned')}</option>
                      {parent.workers.map(worker => (
                        <option key={worker.stationId} value={worker.stationId}>
                          {workerLineLabel(worker)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
