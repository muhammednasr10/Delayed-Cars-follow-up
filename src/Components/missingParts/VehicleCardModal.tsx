import { Car, Undo2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { formatDateTime } from '../../Utils/missingPartPageUtils'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { uniqueVehicleReps } from '../../Utils/missingPartPageUtils'
import {
  branchBlocksForGroup,
  mainPartsForReportGroup
} from '../../Utils/shortageGroupDisplay'
import { Modal } from '../Modal'
import type { MissingPartDetail } from '../../Types/missingPart'
import { ChassisChipMeta, uniqueCardLabels, VehicleCardField, VehicleCardIssueCard } from './VehicleCardBits'

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
  const rep = vehicles[0]!
  const transferred = parts.some(p => !!p.transferredAt)
  const archived = vehicles.some(v => Boolean(v.shortageResolvedAt))
  const pendingRestore = vehicles.some(v => Boolean(v.pendingRestoreRequestId))
  const restoreBusy = vehicles.some(v => restoringVehicleId === v.vehicleId)
  const restoreTarget = vehicles.find(v => v.shortageResolvedAt) ?? rep
  const models = uniqueCardLabels(vehicles.map(v => v.modelName))
  const colors = uniqueCardLabels(vehicles.map(v => formatVehicleColorLabel(v.colorName, v.colorCode)))
  const orgLabel = orgUnitLabelFor?.(rep.factoryOrgUnitId) || orgUnitLabel || '—'
  const mixedOrg = vehicles.some(
    v => (orgUnitLabelFor?.(v.factoryOrgUnitId) || orgUnitLabel || '—') !== orgLabel
  )
  const reporter = uniqueCardLabels(parts.map(p => p.createdByName || p.createdByEmail))
  const completer = uniqueCardLabels(parts.map(p => p.shortageResolvedByName))
  const station = uniqueCardLabels(
    vehicles.map(v =>
      v.stationNumber ? `${v.stationNumber}${v.stationName ? ` — ${v.stationName}` : ''}` : null
    )
  )

  const sharedIssues = multiVin ? mainPartsForReportGroup(parts) : []
  const useGroupLayout = multiVin && sharedIssues.length > 0
  const branchBlocks = useGroupLayout ? branchBlocksForGroup(parts) : []
  const partsByVehicle = vehicles.map(v => ({
    vehicle: v,
    issues: parts.filter(p => p.vehicleId === v.vehicleId)
  }))
  const entryAtByVehicle = new Map<string, string>()
  for (const part of parts) {
    const current = entryAtByVehicle.get(part.vehicleId)
    if (part.createdAt && (!current || part.createdAt < current)) {
      entryAtByVehicle.set(part.vehicleId, part.createdAt)
    }
  }

  const issueCardProps = {
    lang,
    reasons,
    departments,
    canTransferIssue,
    onTransferIssue,
    transferringPartId,
    completingVehicleId,
    t
  }

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
                  <p
                    className={`font-mono font-black text-cyan-100 ${multiVin ? 'mt-1 text-base' : 'text-xl'}`}
                    dir="ltr"
                  >
                    {vin}
                  </p>
                  {multiVin && (
                    <ChassisChipMeta
                      vehicle={vehicles[i]!}
                      enteredAt={entryAtByVehicle.get(vehicles[i]!.vehicleId) ?? vehicles[i]!.createdAt}
                      lang={lang}
                      dateTimeLabel={t('mp.cols.dateTime')}
                      orgLabel={
                        mixedOrg
                          ? orgUnitLabelFor?.(vehicles[i]!.factoryOrgUnitId) || orgUnitLabel || '—'
                          : ''
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <VehicleCardField label={t('mp.cols.model')} value={models} />
            <VehicleCardField label={t('mp.cols.color')} value={colors} />
            <VehicleCardField label={t('mp.cols.orgUnit')} value={mixedOrg ? '—' : orgLabel} />
            <VehicleCardField label={t('mp.cols.station')} value={station} />
            <VehicleCardField label={t('mp.cols.createdBy')} value={reporter} />
            {completer !== '—' && <VehicleCardField label={t('mp.cols.completer')} value={completer} />}
          </dl>
        </section>

        {useGroupLayout ? (
          <>
            <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
              <h3 className="mb-3 text-xs font-black uppercase text-cyan-300">
                {t('mp.vehicleCard.section.sharedIssues', { n: vins.length })}
              </h3>
              <div className="space-y-2">
                {sharedIssues.map(p => (
                  <VehicleCardIssueCard
                    key={`shared-${p.partDescription}-${p.reason}`}
                    part={p}
                    showWhen={false}
                    {...issueCardProps}
                  />
                ))}
              </div>
            </section>

            {branchBlocks.length > 0 && (
              <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <h3 className="mb-3 text-xs font-black uppercase text-amber-400">
                  {t('mp.vehicleCard.section.branchIssues')} ({branchBlocks.length})
                </h3>
                <div className="space-y-4">
                  {branchBlocks.map(block => (
                    <div key={block.vehicleId} className="space-y-2 border-s-2 border-cyan-500/35 ps-3">
                      <p className="text-xs font-black text-cyan-200">
                        <span className="me-1.5 font-mono text-slate-500" aria-hidden>
                          └
                        </span>
                        {t('mp.cols.vin')} <span className="font-mono" dir="ltr">{block.vin}</span>
                        <span className="ms-2 font-medium text-slate-400">{block.modelName}</span>
                      </p>
                      {block.parts.map(p => (
                        <VehicleCardIssueCard key={p.id} part={p} {...issueCardProps} />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
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
                  {issues.map(p => (
                    <VehicleCardIssueCard key={p.id} part={p} {...issueCardProps} />
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
