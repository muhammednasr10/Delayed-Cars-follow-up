import { Car } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { formatDateTime } from '../../Utils/missingPartPageUtils'
import { Modal } from '../Modal'
import type { MissingPartDetail } from '../../Types/missingPart'

type Props = {
  parts: MissingPartDetail[] | null
  orgUnitLabel?: string
  completingVehicleId?: string | null
  transferringPartId?: string | null
  canTransferIssue?: boolean
  onTransferIssue?: (part: MissingPartDetail) => void | Promise<void>
  onClose: () => void
}

function Field({ label, value, dir, mono }: { label: string; value: string; dir?: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-100 ${mono ? 'font-mono' : ''}`} dir={dir}>
        {value || '—'}
      </dd>
    </div>
  )
}

export function VehicleCardModal({
  parts,
  orgUnitLabel,
  completingVehicleId,
  transferringPartId,
  canTransferIssue,
  onTransferIssue,
  onClose
}: Props) {
  const { t, lang } = useLang()
  const { reasons, departments } = useMpLookups()

  if (!parts?.length) return null
  const rep = parts[0]
  const archived = parts.some(p => !!p.shortageResolvedAt)

  return (
    <Modal
      open={Boolean(parts?.length)}
      onClose={onClose}
      title={t('mp.vehicleCard.title')}
      subtitle={rep.vin}
      icon={<Car className="h-5 w-5" />}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-5">
        {/* Vehicle header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-black text-cyan-100" dir="ltr">
              {rep.vin}
            </span>
            {archived && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-200">
                {t('mp.vehicleCard.archiveBadge')}
              </span>
            )}
          </div>
        </div>

        {/* Vehicle info */}
        <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="mb-3 text-xs font-black uppercase text-cyan-400">
            {t('mp.vehicleCard.section.vehicle')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('mp.cols.vin')} value={rep.vin} dir="ltr" mono />
            <Field label={t('mp.cols.model')} value={rep.modelName} />
            <Field
              label={t('mp.cols.color')}
              value={rep.colorName || '—'}
            />
            <Field label={t('mp.cols.orgUnit')} value={orgUnitLabel || '—'} />
          </div>
        </section>

        {/* Station & reporter */}
        {(rep.stationNumber || rep.createdByName) && (
          <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <h3 className="mb-3 text-xs font-black uppercase text-cyan-400">
              {t('mp.vehicleCard.section.station')} / {t('mp.vehicleCard.section.reporter')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {rep.stationNumber && (
                <Field label={t('mp.cols.station')} value={`${rep.stationNumber}${rep.stationName ? ` — ${rep.stationName}` : ''}`} dir="ltr" />
              )}
              {rep.createdByName && (
                <Field label={t('mp.cols.createdBy')} value={rep.createdByName} />
              )}
            </div>
          </section>
        )}

        {/* Issues */}
        <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-black uppercase text-amber-400">
              {t('mp.vehicleCard.section.issues')} ({parts.length})
            </h3>
          </div>
          <div className="space-y-2">
            {parts.map(p => {
              const { date, time } = formatDateTime(p.createdAt, lang)
              const issueOpen = p.status !== 'closed' && p.status !== 'cancelled' && !p.shortageResolvedAt
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-100">{p.partDescription}</p>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-mono text-xs tabular-nums text-slate-400">
                        <span className="text-cyan-200">{p.installedQty}</span>
                        <span className="text-slate-600">/</span>
                        <span>{p.requiredQty}</span>
                      </span>
                      {canTransferIssue && onTransferIssue && issueOpen && (
                        <button
                          type="button"
                          disabled={Boolean(transferringPartId) || completingVehicleId === p.vehicleId}
                          onClick={() => onTransferIssue(p)}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
                        >
                          {transferringPartId === p.id ? '...' : t('mp.vehicleCard.transferIssue')}
                        </button>
                      )}
                      {!issueOpen && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                          {t('mp.vehicleCard.archiveBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>{mpLookupLabel(reasons, p.reason, lang)}</span>
                    <span>{mpLookupLabel(departments, p.department, lang)}</span>
                    <span className="text-slate-500">{date} {time}</span>
                  </div>
                  {p.notes?.trim() && (
                    <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">{p.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Modal>
  )
}
