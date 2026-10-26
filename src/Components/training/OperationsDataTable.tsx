import { useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { iplPartIdFromNotes } from '../../Utils/iplStationParts'
import {
  buildOperationCompareRow,
  classifyHardwareFromIpl,
  classifyOperationCompare,
  type HardwareIplCompare,
  type OperationClassCompare
} from '../../Utils/operationIplCompare'
import type { BomItemDetail } from '../../Types/bom'
import type { ModelLine } from '../../Utils/modelLines'
import type { ParentStationOperationsGroup, StationOperationDetail, WorkerOperationsGroup } from '../../Types/timeStudy'
import { OperationSharedDiffCard } from './OperationSharedDiffCard'
import { OperationsDataTableRow } from './OperationsDataTableRow'

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
  compareModels?: string[]
  bomByPartId?: Map<string, BomItemDetail[]>
  hardwareBomRows?: BomItemDetail[]
  onStudyFields: (op: StationOperationDetail) => void
  onEdit: (op: StationOperationDetail) => void
  onDelete: (op: StationOperationDetail) => void
  onMove: (op: StationOperationDetail, workerStationId: string) => void
}

type DetailState =
  | {
      kind: 'classification'
      title: string
      subtitle: string
      compare: OperationClassCompare
    }
  | {
      kind: 'hardware'
      title: string
      subtitle: string
      op: StationOperationDetail
      hardwareCompare: HardwareIplCompare
    }

export function OperationsDataTable({
  rows,
  contextLine,
  canManage,
  compact = false,
  compareModels = [],
  bomByPartId,
  hardwareBomRows = [],
  onStudyFields,
  onEdit,
  onDelete,
  onMove
}: Props) {
  const { t } = useLang()
  const [detail, setDetail] = useState<DetailState | null>(null)

  const compareByPartId = useMemo(() => {
    const map = new Map<string, OperationClassCompare>()
    if (!bomByPartId || compareModels.length === 0) return map
    for (const [partId, bomRows] of bomByPartId) {
      const row = buildOperationCompareRow(partId, compareModels, bomRows)
      if (!row) continue
      map.set(partId, classifyOperationCompare(row, compareModels))
    }
    return map
  }, [bomByPartId, compareModels])

  const hardwareCompareByOpId = useMemo(() => {
    const map = new Map<string, HardwareIplCompare>()
    for (const { op } of rows) {
      map.set(op.id, classifyHardwareFromIpl(op.hardware, compareModels, hardwareBomRows))
    }
    return map
  }, [rows, compareModels, hardwareBomRows])

  if (rows.length === 0) {
    return <p className="p-4 text-center text-sm text-slate-500">{t('common.noData')}</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className={`w-full text-center text-xs ${compact ? 'min-w-[880px]' : 'min-w-[1280px]'}`}>
          <thead className="bg-slate-950/90">
            <tr>
              {!compact && (
                <th className="table-cell text-center font-black uppercase text-slate-400">
                  {t('operations.cols.stationWorker')}
                </th>
              )}
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.operationKind')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.part')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.partNumber')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.qtyPerCar')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.station')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.model')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.hardware')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.timeSec')}
              </th>
              <th className="table-cell text-center font-black uppercase text-slate-400">
                {t('operations.cols.timeMin')}
              </th>
              {!compact && (
                <th className="table-cell text-center font-black uppercase text-slate-400">
                  {t('operations.cols.workerMin')}
                </th>
              )}
              {!compact && (
                <>
                  <th className="table-cell text-center font-black uppercase text-slate-400">
                    {t('operations.cols.totalWorkers')}
                  </th>
                  <th className="table-cell text-center font-black uppercase text-slate-400">
                    {t('operations.cols.avgStationMin')}
                  </th>
                </>
              )}
              <th className="table-cell text-center font-black uppercase text-slate-400">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(({ op, worker, parent }) => {
              const partId = iplPartIdFromNotes(op.notes)
              const compare = partId ? compareByPartId.get(partId) : undefined
              const hardwareCompare = hardwareCompareByOpId.get(op.id) ?? {
                mode: 'missing' as const,
                qtyLabel: '0',
                compare: null,
                titleName: ''
              }
              return (
                <OperationsDataTableRow
                  key={op.id}
                  op={op}
                  worker={worker}
                  parent={parent}
                  contextLine={contextLine}
                  canManage={canManage}
                  compact={compact}
                  compare={compare}
                  hardwareCompare={hardwareCompare}
                  onOpenClassification={(next, partLabel) =>
                    setDetail({
                      kind: 'classification',
                      title:
                        next.overall === 'shared'
                          ? t('operations.sharedDiff.sharedInTitle')
                          : t('operations.sharedDiff.differentInTitle'),
                      subtitle: partLabel,
                      compare: next
                    })
                  }
                  onOpenHardware={(next, partLabel, operation) =>
                    setDetail({
                      kind: 'hardware',
                      title:
                        next.mode === 'shared'
                          ? t('operations.sharedDiff.sharedHardwareTitle')
                          : t('operations.sharedDiff.differentHardwareTitle'),
                      subtitle: next.titleName || partLabel,
                      op: operation,
                      hardwareCompare: next
                    })
                  }
                  onStudyFields={onStudyFields}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMove={onMove}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {detail?.kind === 'classification' ? (
        <OperationSharedDiffCard
          kind="classification"
          open
          title={detail.title}
          subtitle={detail.subtitle}
          sections={[
            { label: t('bom.col.part_number'), result: detail.compare.partNumber, mono: true },
            { label: t('bom.station'), result: detail.compare.station },
            { label: t('bom.qtyPerCar'), result: detail.compare.quantity }
          ]}
          onClose={() => setDetail(null)}
        />
      ) : null}
      {detail?.kind === 'hardware' ? (
        <OperationSharedDiffCard
          kind="hardware"
          open
          title={detail.title}
          subtitle={detail.subtitle}
          hardware={detail.op.hardware}
          compare={detail.hardwareCompare.compare}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
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
