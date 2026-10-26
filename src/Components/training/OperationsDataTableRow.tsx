import { ArrowRightLeft, Link2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { IplCompareFieldCell } from '../bom/IplCompareFieldCell'
import { formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import { iplPartIdFromNotes } from '../../Utils/iplStationParts'
import { iplOperationKindFromName, iplPartNameFromOperation, iplPartNumberFromOperation } from '../../Utils/iplOperationKind'
import type { HardwareIplCompare, OperationClassCompare } from '../../Utils/operationIplCompare'
import type { FieldCompareResult } from '../../Utils/iplModelCompare'
import { classificationBadgeClass, formatOperationClassification, primaryModelLineScope } from '../../Utils/operationClassification'
import type { ModelLine } from '../../Utils/modelLines'
import type { StationOperationDetail, WorkerOperationsGroup, ParentStationOperationsGroup } from '../../Types/timeStudy'

function SharedDiffBadge({
  mode,
  qtyLabel,
  onClick
}: {
  mode: 'shared' | 'different'
  qtyLabel?: string
  onClick: () => void
}) {
  const { t } = useLang()
  const label = mode === 'shared' ? t('operations.sharedDiff.shared') : t('operations.sharedDiff.different')
  const text = qtyLabel ? t('operations.sharedDiff.withQty', { label, n: qtyLabel }) : label
  const tone =
    mode === 'shared'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black transition ${tone}`}
    >
      {text}
    </button>
  )
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

function hasStudyFields(op: StationOperationDetail): boolean {
  return Boolean(
    op.technicianPosition?.trim() ||
      op.taskPrecedence?.trim() ||
      op.rankedPositionalWeight != null ||
      op.zoningConstraints?.trim()
  )
}

function CompareValueCell({
  result,
  fallback,
  differentLabel,
  mono,
  onOpen
}: {
  result: FieldCompareResult | undefined
  fallback: string
  differentLabel: string
  mono?: boolean
  onOpen: () => void
}) {
  if (result && result.status !== 'missing') {
    return (
      <IplCompareFieldCell result={result} differentLabel={differentLabel} mono={mono} onOpenDetail={onOpen} />
    )
  }
  if (!fallback) return <span className="text-slate-600">—</span>
  return (
    <span className={`text-xs ${mono ? 'font-mono text-cyan-200' : 'text-slate-300'}`} dir={mono ? 'ltr' : undefined}>
      {fallback}
    </span>
  )
}

export type OperationsDataTableRowProps = {
  op: StationOperationDetail
  worker: WorkerOperationsGroup
  parent: ParentStationOperationsGroup
  contextLine: ModelLine | null
  canManage: boolean
  compact: boolean
  compare: OperationClassCompare | undefined
  hardwareCompare: HardwareIplCompare
  onOpenClassification: (compare: OperationClassCompare, partLabel: string) => void
  onOpenHardware: (hardwareCompare: HardwareIplCompare, partLabel: string, op: StationOperationDetail) => void
  onStudyFields: (op: StationOperationDetail) => void
  onEdit: (op: StationOperationDetail) => void
  onDelete: (op: StationOperationDetail) => void
  onMove: (op: StationOperationDetail, workerStationId: string) => void
}

export function OperationsDataTableRow({
  op,
  worker,
  parent,
  contextLine,
  canManage,
  compact,
  compare,
  hardwareCompare,
  onOpenClassification,
  onOpenHardware,
  onStudyFields,
  onEdit,
  onDelete,
  onMove
}: OperationsDataTableRowProps) {
  const { t } = useLang()
  const partLabel = iplOperationKindFromName(op.operationNameAr)
    ? iplPartNameFromOperation(op.operationNameAr)
    : op.operationNameAr
  const partNumber = iplPartNumberFromOperation(op.operationNameAr)
  const classLabel = formatOperationClassification(op.operationType, contextLine ?? undefined)
  const openCompare = () => {
    if (compare && compare.overall !== 'missing') onOpenClassification(compare, partLabel)
  }
  const studyFilled = hasStudyFields(op)
  const iplLinked = Boolean(iplPartIdFromNotes(op.notes))
  const operationKind = iplOperationKindFromName(op.operationNameAr) || op.toolSpec?.trim() || ''

  return (
    <tr className="bg-slate-900/30 hover:bg-slate-800/40">
      {!compact && (
        <td className="table-cell whitespace-nowrap text-center font-mono font-bold text-cyan-200" dir="ltr">
          {formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)}
        </td>
      )}
      <td className="table-cell text-center text-slate-300">
        <span className="inline-flex items-center justify-center gap-1.5">
          {iplLinked ? (
            <span
              title={t('operations.iplLinkedHint')}
              className="inline-flex items-center gap-0.5 rounded-md border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-sky-200"
            >
              <Link2 className="h-3 w-3" />
              {t('operations.iplLinked')}
            </span>
          ) : null}
          <span>{operationKind || '—'}</span>
        </span>
      </td>
      <td className="table-cell min-w-[10rem] text-center font-bold text-slate-100">{partLabel}</td>
      <td className="table-cell text-center">
        <CompareValueCell
          result={compare?.partNumber}
          fallback={partNumber}
          differentLabel={t('operations.sharedDiff.different')}
          mono
          onOpen={openCompare}
        />
      </td>
      <td className="table-cell text-center">
        <CompareValueCell
          result={compare?.quantity}
          fallback=""
          differentLabel={t('operations.sharedDiff.different')}
          onOpen={openCompare}
        />
      </td>
      <td className="table-cell text-center">
        <CompareValueCell
          result={compare?.station}
          fallback={parent.displayCode || ''}
          differentLabel={t('operations.sharedDiff.different')}
          onOpen={openCompare}
        />
      </td>
      <td className="table-cell text-center">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black ${classificationBadgeClass(
            classLabel,
            primaryModelLineScope(op.operationType)
          )}`}
        >
          {classLabel}
        </span>
      </td>
      <td className="table-cell max-w-[14rem] text-center">
        {hardwareCompare.mode === 'missing' ? (
          <span className="text-slate-500">—</span>
        ) : (
          <SharedDiffBadge
            mode={hardwareCompare.mode}
            qtyLabel={hardwareCompare.qtyLabel}
            onClick={() => onOpenHardware(hardwareCompare, partLabel, op)}
          />
        )}
      </td>
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
          <td className="table-cell text-center font-bold text-white">
            {parent.workers.length || parent.totalWorkers}
          </td>
          <td className="table-cell text-center font-mono text-orange-200" dir="ltr">
            {parent.avgStationTimeMinutes != null ? formatMin(parent.avgStationTimeMinutes) : '—'}
          </td>
        </>
      )}
      <td className="table-cell whitespace-nowrap text-center">
        <div className="flex justify-center gap-1">
          <button
            type="button"
            onClick={() => onStudyFields(op)}
            title={t('operations.studyFields')}
            className={`rounded p-1.5 ${
              studyFilled
                ? 'text-cyan-300 hover:bg-cyan-500/15 hover:text-cyan-200'
                : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
          </button>
          {canManage && (
            <>
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
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
