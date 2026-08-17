import { Car, Undo2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { formatDateTime, uniqueVehicleReps } from '../../Utils/missingPartPageUtils'
import { Modal } from '../Modal'
import type { MissingPartDetail } from '../../Types/missingPart'

type Props = {
  parts: MissingPartDetail[] | null
  orgUnitLabel?: string
  orgUnitLabelFor?: (id: string | null | undefined) => string
  completingVehicleId?: string | null
  transferringPartId?: string | null
  restoringVehicleId?: string | null
  canTransferIssue?: boolean
  canRestoreFromArchive?: boolean
  onTransferIssue?: (part: MissingPartDetail) => void | Promise<void>
  onRestoreFromArchive?: (part: MissingPartDetail) => void
  onClose: () => void
  zIndexClass?: string
}

function Field({ label, value, dir, mono }: { label: string; value: string; dir?: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-slate-100 ${mono ? 'font-mono' : ''}`} dir={dir}>
        {value || '—'}
      </dd>
    </div>
  )
}

function uniqueLabels(values: Array<string | null | undefined>): string {
  const names = [...new Set(values.map(v => v?.trim()).filter((n): n is string => Boolean(n)))]
  return names.length > 0 ? names.join(' · ') : '—'
}

export function VehicleCardModal({
  parts,
  orgUnitLabel,
  orgUnitLabelFor,
  completingVehicleId,
  transferringPartId,
  restoringVehicleId,
  canTransferIssue,
  canRestoreFromArchive,
  onTransferIssue,
  onRestoreFromArchive,
  onClose,
  zIndexClass
}: Props) {
  const { t, lang } = useLang()
  const { reasons, departments } = useMpLookups()

  if (!parts?.length) return null

  const vehicles = uniqueVehicleReps(parts)
  const vins = vehicles.map(v => v.vin)
  const multiVin = vins.length > 1
  const rep = vehicles[0]
  const transferred = parts.some(p => !!p.transferredAt)
  const archived = vehicles.some(v => Boolean(v.shortageResolvedAt))
  const pendingRestore = vehicles.some(v => Boolean(v.pendingRestoreRequestId))
  const restoreBusy = vehicles.some(v => restoringVehicleId === v.vehicleId)
  const restoreTarget = vehicles.find(v => v.shortageResolvedAt) ?? rep
  const models = uniqueLabels(vehicles.map(v => v.modelName))
  const colors = uniqueLabels(vehicles.map(v => formatVehicleColorLabel(v.colorName, v.colorCode)))
  const orgLabel =
    orgUnitLabelFor?.(rep.factoryOrgUnitId) || orgUnitLabel || '—'
  const mixedOrg = vehicles.some(
    v => (orgUnitLabelFor?.(v.factoryOrgUnitId) || orgUnitLabel || '—') !== orgLabel
  )
  const reporter = uniqueLabels(parts.map(p => p.createdByName || p.createdByEmail))
  const completer = uniqueLabels(parts.map(p => p.shortageResolvedByName))
  const station = uniqueLabels(
    vehicles.map(v =>
      v.stationNumber ? `${v.stationNumber}${v.stationName ? ` — ${v.stationName}` : ''}` : null
    )
  )

  const partsByVehicle = vehicles.map(v => ({
    vehicle: v,
    issues: parts.filter(p => p.vehicleId === v.vehicleId)
  }))

  return (
    <Modal
      open={Boolean(parts?.length)}
      onClose={onClose}
      title={t('mp.vehicleCard.title')}
      subtitle={
        multiVin
          ? t('mp.vehicleCard.vinCountSubtitle', { n: vins.length })
          : `${rep.modelName} · ${rep.vin}`
      }
      icon={<Car className="h-5 w-5" />}
      maxWidthClass={multiVin ? 'max-w-2xl' : 'max-w-lg'}
      zIndexClass={zIndexClass}
      footer={
        archived && canRestoreFromArchive && onRestoreFromArchive ? (
          <button
            type="button"
            disabled={restoreBusy || pendingRestore}
            onClick={() => onRestoreFromArchive(restoreTarget)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-black text-amber-100 hover:bg-amber-500/25 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
            {restoreBusy
              ? '...'
              : pendingRestore
                ? t('mp.workflow.restorePending')
                : t('mp.vehicleCard.restoreToCurrent')}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-black uppercase text-cyan-400">{t('mp.vehicleCard.section.vehicle')}</h3>
            {transferred && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-200">
                {t('mp.vehicleCard.archiveBadge')}
              </span>
            )}
            {pendingRestore && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-200">
                {t('mp.workflow.restorePending')}
              </span>
            )}
          </div>

          <div className="mb-3">
            <p className="mb-2 text-[11px] font-bold text-slate-500">
              {multiVin ? t('mp.vehicleCard.chassisList', { n: vins.length }) : t('mp.cols.vin')}
            </p>
            <div className={multiVin ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : ''}>
              {vins.map((vin, i) => (
                <div
                  key={vin}
                  className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-2.5 text-center"
                >
                  {multiVin && <p className="text-[10px] font-bold uppercase text-slate-500">{i + 1}</p>}
                  <p className={`font-mono font-black text-cyan-100 ${multiVin ? 'mt-1 text-base' : 'text-xl'}`} dir="ltr">
                    {vin}
                  </p>
                  {multiVin && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {vehicles[i].modelName}
                      {formatVehicleColorLabel(vehicles[i].colorName, vehicles[i].colorCode)
                        ? ` · ${formatVehicleColorLabel(vehicles[i].colorName, vehicles[i].colorCode)}`
                        : ''}
                      {mixedOrg
                        ? ` · ${orgUnitLabelFor?.(vehicles[i].factoryOrgUnitId) || orgUnitLabel || '—'}`
                        : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label={t('mp.cols.model')} value={models} />
            <Field label={t('mp.cols.color')} value={colors} />
            <Field label={t('mp.cols.orgUnit')} value={mixedOrg ? '—' : orgLabel} />
            <Field label={t('mp.cols.station')} value={station} />
            <Field label={t('mp.cols.createdBy')} value={reporter} />
            {completer !== '—' && <Field label={t('mp.cols.completer')} value={completer} />}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="mb-3 text-xs font-black uppercase text-amber-400">
            {t('mp.vehicleCard.section.issues')} ({parts.length})
          </h3>
          <div className="space-y-3">
            {partsByVehicle.map(({ vehicle, issues }) => (
              <div key={vehicle.vehicleId} className="space-y-2">
                {multiVin && (
                  <p className="text-xs font-black text-cyan-200">
                    {t('mp.cols.vin')} <span className="font-mono" dir="ltr">{vehicle.vin}</span>
                    <span className="ms-2 font-medium text-slate-400">{vehicle.modelName}</span>
                  </p>
                )}
                {issues.map(p => {
                  const { date, time } = formatDateTime(p.createdAt, lang)
                  const issueOpen = p.status !== 'closed' && p.status !== 'cancelled' && !p.shortageResolvedAt
                  const transferPending = Boolean(p.pendingTransferRequestId)
                  return (
                    <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-100">{p.partDescription}</p>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="font-mono text-xs tabular-nums text-slate-400">
                            <span className="text-cyan-200">{p.installedQty}</span>
                            <span className="text-slate-600">/</span>
                            <span>{p.requiredQty}</span>
                          </span>
                          {canTransferIssue && onTransferIssue && issueOpen && !transferPending && (
                            <button
                              type="button"
                              disabled={Boolean(transferringPartId) || completingVehicleId === p.vehicleId}
                              onClick={() => onTransferIssue(p)}
                              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
                            >
                              {transferringPartId === p.id ? '...' : t('mp.vehicleCard.transferIssue')}
                            </button>
                          )}
                          {transferPending && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-200">
                              {t('mp.workflow.transferPending')}
                            </span>
                          )}
                          {!!p.transferredAt && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                              {t('mp.vehicleCard.archiveBadge')}
                            </span>
                          )}
                        </div>
                      </div>
                      <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Field
                          label={t('mp.cols.reasonClass')}
                          value={mpLookupLabel(reasons, p.reason, lang)}
                        />
                        <Field
                          label={t('mp.cols.causingDepartment')}
                          value={mpLookupLabel(departments, p.department, lang)}
                        />
                        <Field
                          label={t('mp.cols.followUpEmployee')}
                          value={p.followUpEmployeeName?.trim() || '—'}
                        />
                        <Field
                          label={t('mp.cols.completingDepartment')}
                          value={mpLookupLabel(departments, p.completingDepartment ?? '', lang)}
                        />
                      </dl>
                      <p className="mt-2 text-xs text-slate-500">
                        {date} {time}
                      </p>
                      {p.notes?.trim() && (
                        <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">{p.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
