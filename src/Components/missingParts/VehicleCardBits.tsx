import { formatDateTime } from '../../Utils/missingPartPageUtils'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { useMpLookups } from '../../hooks/useMpLookups'
import type { MissingPartDetail } from '../../Types/missingPart'

export function VehicleCardField({
  label,
  value,
  dir,
  mono
}: {
  label: string
  value: string
  dir?: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-slate-100 ${mono ? 'font-mono' : ''}`} dir={dir}>
        {value || '—'}
      </dd>
    </div>
  )
}

export function ChassisChipMeta({
  vehicle,
  enteredAt,
  lang,
  dateTimeLabel,
  orgLabel
}: {
  vehicle: MissingPartDetail
  enteredAt: string
  lang: string
  dateTimeLabel: string
  orgLabel: string
}) {
  const { date, time } = formatDateTime(enteredAt, lang)
  const color = formatVehicleColorLabel(vehicle.colorName, vehicle.colorCode)
  return (
    <>
      <p className="mt-1 text-[11px] text-slate-400">
        {vehicle.modelName}
        {color ? ` · ${color}` : ''}
        {orgLabel ? ` · ${orgLabel}` : ''}
      </p>
      <p className="mt-1 text-[11px] text-slate-300">
        <span className="text-slate-500">{dateTimeLabel}</span>
        <span className="mt-0.5 block font-mono tabular-nums">
          {date} {time}
        </span>
      </p>
    </>
  )
}

export function uniqueCardLabels(values: Array<string | null | undefined>): string {
  const names = [...new Set(values.map(v => v?.trim()).filter((n): n is string => Boolean(n)))]
  return names.length > 0 ? names.join(' · ') : '—'
}

type IssueCardProps = {
  part: MissingPartDetail
  lang: string
  reasons: ReturnType<typeof useMpLookups>['reasons']
  departments: ReturnType<typeof useMpLookups>['departments']
  canTransferIssue?: boolean
  onTransferIssue?: (part: MissingPartDetail) => void | Promise<void>
  transferringPartId?: string | null
  completingVehicleId?: string | null
  showWhen?: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
}

export function VehicleCardIssueCard({
  part,
  lang,
  reasons,
  departments,
  canTransferIssue,
  onTransferIssue,
  transferringPartId,
  completingVehicleId,
  showWhen = true,
  t
}: IssueCardProps) {
  const { date, time } = formatDateTime(part.createdAt, lang)
  const issueOpen = part.status !== 'closed' && part.status !== 'cancelled' && !part.shortageResolvedAt
  const transferPending = Boolean(part.pendingTransferRequestId)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-100">{part.partDescription}</p>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-mono text-xs tabular-nums text-slate-400">
            <span className="text-cyan-200">{part.installedQty}</span>
            <span className="text-slate-600">/</span>
            <span>{part.requiredQty}</span>
          </span>
          {canTransferIssue && onTransferIssue && issueOpen && !transferPending && (
            <button
              type="button"
              disabled={Boolean(transferringPartId) || completingVehicleId === part.vehicleId}
              onClick={() => onTransferIssue(part)}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
            >
              {transferringPartId === part.id ? '...' : t('mp.vehicleCard.transferIssue')}
            </button>
          )}
          {transferPending && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-200">
              {t('mp.workflow.transferPending')}
            </span>
          )}
          {!!part.transferredAt && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-200">
              {t('mp.vehicleCard.archiveBadge')}
            </span>
          )}
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <VehicleCardField label={t('mp.cols.reasonClass')} value={mpLookupLabel(reasons, part.reason, lang)} />
        <VehicleCardField
          label={t('mp.cols.causingDepartment')}
          value={mpLookupLabel(departments, part.department, lang)}
        />
        <VehicleCardField
          label={t('mp.cols.followUpEmployee')}
          value={part.followUpEmployeeNames?.trim() || part.followUpEmployeeName?.trim() || '—'}
        />
        <VehicleCardField
          label={t('mp.cols.completingDepartment')}
          value={mpLookupLabel(departments, part.completingDepartment ?? '', lang)}
        />
      </dl>
      {showWhen && (
        <p className="mt-2 text-xs text-slate-500">
          {date} {time}
        </p>
      )}
      {part.notes?.trim() && (
        <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">{part.notes}</p>
      )}
    </div>
  )
}
