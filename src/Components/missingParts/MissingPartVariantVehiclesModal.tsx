import { Car } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { VariantVehicleSummary } from '../../Utils/missingPartPageUtils'
import { notesCountForVehicleIds } from '../../services/vehicleNotesService'
import { Modal } from '../Modal'
import { MissingPartVehicleActions } from './MissingPartVehicleActions'
import type { ShortageMissionAssignInput } from './MpAssignShortageMissionButton'

type ActionProps = {
  allItems: MissingPartDetail[]
  canUpdateStatus: boolean
  canNotes: boolean
  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
  noteCounts?: Record<string, number>
  completingVehicleId?: string | null
  onOpenNotes: (part: MissingPartDetail) => void
  onOpenDetail?: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onAssignFollowUp?: (
    part: MissingPartDetail,
    assignment: { completingDepartment: string; followUpEmployeeId: string }
  ) => void
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
}

type Props = {
  variantName: string | null
  familyName?: string
  vehicles: VariantVehicleSummary[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  onClose: () => void
} & Partial<ActionProps>

function activeParts(parts: MissingPartDetail[]) {
  return parts.filter(p => p.status !== 'closed' && p.status !== 'cancelled')
}

export function MissingPartVariantVehiclesModal({
  variantName,
  familyName,
  vehicles,
  reasons,
  departments,
  onClose,
  allItems,
  canUpdateStatus = false,
  canNotes = false,
  canEdit = false,
  canDelete = false,
  canComplete = false,
  noteCounts = {},
  completingVehicleId = null,
  onOpenNotes,
  onOpenDetail,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy
}: Props) {
  const { t, lang } = useLang()
  if (!variantName) return null

  const hasActions = Boolean(allItems && onEdit && onUpdate && onDeleteParts && onComplete && onOpenNotes)
  const anyPerm =
    canUpdateStatus ||
    canNotes ||
    canEdit ||
    canDelete ||
    canComplete ||
    Boolean(onAssignFollowUp) ||
    Boolean(onAssignShortageMission)

  return (
    <Modal
      open={Boolean(variantName)}
      title={t('mp.familyCards.vehiclesTitle', { model: variantName })}
      subtitle={t('mp.familyCards.vehiclesSubtitle', { n: vehicles.length })}
      icon={<Car className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      {familyName && familyName !== variantName && (
        <p className="mb-4 text-center text-xs text-slate-500">
          {t('mp.familyCards.familyLabel', { family: familyName })}
        </p>
      )}

      <div className="max-h-[min(65vh,520px)] space-y-3 overflow-y-auto pe-1">
        {vehicles.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t('common.noResults')}</p>
        ) : (
          vehicles.map(vehicle => (
            <VehicleShortageCard
              key={vehicle.vehicleId}
              vehicle={vehicle}
              reasons={reasons}
              departments={departments}
              lang={lang}
              showActions={hasActions && anyPerm}
              allItems={allItems ?? []}
              canUpdateStatus={canUpdateStatus}
              canNotes={canNotes}
              canEdit={canEdit}
              canDelete={canDelete}
              canComplete={canComplete}
              noteCounts={noteCounts}
              completingVehicleId={completingVehicleId}
              onOpenNotes={onOpenNotes!}
              onOpenDetail={onOpenDetail}
              onEdit={onEdit!}
              onUpdate={onUpdate!}
              onDeleteParts={onDeleteParts!}
              onComplete={onComplete!}
              onAssignFollowUp={onAssignFollowUp}
              onAssignShortageMission={onAssignShortageMission}
              assignMissionBusy={assignMissionBusy}
            />
          ))
        )}
      </div>
    </Modal>
  )
}

function VehicleShortageCard({
  vehicle,
  reasons,
  departments,
  lang,
  showActions,
  allItems,
  canUpdateStatus,
  canNotes,
  canEdit,
  canDelete,
  canComplete,
  noteCounts,
  completingVehicleId,
  onOpenNotes,
  onOpenDetail,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy
}: {
  vehicle: VariantVehicleSummary
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  lang: string
  showActions: boolean
  allItems: MissingPartDetail[]
  canUpdateStatus: boolean
  canNotes: boolean
  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
  noteCounts: Record<string, number>
  completingVehicleId?: string | null
  onOpenNotes: (part: MissingPartDetail) => void
  onOpenDetail?: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onAssignFollowUp?: (
    part: MissingPartDetail,
    assignment: { completingDepartment: string; followUpEmployeeId: string }
  ) => void
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
}) {
  const { t } = useLang()
  const rep = vehicle.parts[0]
  const openParts = activeParts(vehicle.parts)
  const deleteTargets = openParts.length > 0 ? openParts : vehicle.parts
  const noteCount = notesCountForVehicleIds(
    vehicle.parts.map(p => p.vehicleId),
    noteCounts
  )

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-black text-cyan-100" dir="ltr">
            {vehicle.vin}
          </span>
          {vehicle.colorName && (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
              <span
                className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
                style={{ backgroundColor: vehicle.colorHex ?? '#fff' }}
              />
              {formatVehicleColorLabel(vehicle.colorName, vehicle.colorCode)}
            </span>
          )}
          <span className="text-xs font-bold text-amber-300">
            {t('mp.familyCards.issueCount', { n: vehicle.parts.length })}
          </span>
        </div>
        {showActions && rep && (
          <MissingPartVehicleActions
            item={rep}
            issueCount={vehicle.parts.length}
            noteCount={noteCount}
            deleteTargets={deleteTargets}
            allItems={allItems}
            canUpdateStatus={canUpdateStatus}
            canNotes={canNotes}
            canEdit={canEdit}
            canDelete={canDelete}
            canComplete={canComplete}
            completingVehicleId={completingVehicleId}
            onOpenNotes={onOpenNotes}
            onEdit={onEdit}
            onUpdate={onUpdate}
            onDeleteParts={onDeleteParts}
            onComplete={onComplete}
            onAssignFollowUp={onAssignFollowUp}
            onAssignShortageMission={onAssignShortageMission}
            assignMissionBusy={assignMissionBusy}
            layout="stacked"
          />
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {vehicle.parts.map(part => (
          <li key={part.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-start">
            {onOpenDetail ? (
              <button
                type="button"
                onClick={() => onOpenDetail(part)}
                className="text-start text-sm font-bold text-white hover:text-cyan-200 hover:underline"
                title={t('mp.detail.title')}
              >
                {part.partDescription}
              </button>
            ) : (
              <p className="text-sm font-bold text-white">{part.partDescription}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span>
                {t('mp.cols.reasonClass')}:{' '}
                <span className="text-cyan-200">{mpLookupLabel(reasons, part.reason, lang)}</span>
              </span>
              <span>
                {t('mp.cols.department')}:{' '}
                <span className="text-slate-200">{mpLookupLabel(departments, part.department, lang)}</span>
              </span>
              <span className="font-mono">
                {part.installedQty}/{part.requiredQty}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
