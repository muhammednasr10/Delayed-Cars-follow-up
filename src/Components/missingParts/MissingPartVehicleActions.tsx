import { type ReactNode } from 'react'
import { CheckCircle2, MessageSquare, Pencil, Settings2, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { useMissingPartsUiPermissions } from '../../hooks/useMissingPartsUiPermissions'
import type { MissingPartDetail } from '../../Types/missingPart'
import { canCompleteVehicle, iconSize } from '../../Utils/missingPartPageUtils'
import { MpAssignShortageMissionButton } from './MpAssignShortageMissionButton'
import { shortageMissionsForParts } from '../../Utils/shortageMissionLinks'
import { useOpenShortageMissions } from '../../hooks/useOpenShortageMissions'
import type { MpVehicleActionFlags, MpVehicleListActionProps } from '../../Types/mpVehicleActions'

type Props = {
  item: MissingPartDetail
  issueCount: number
  noteCount?: number
  deleteTargets: MissingPartDetail[]
  allItems: MissingPartDetail[]
  rowOpen?: boolean
  archiveMode?: boolean
  completingVehicleId?: string | null
  completeRep?: MissingPartDetail
  completeAllReps?: MissingPartDetail[]
  layout?: 'inline' | 'stacked'
} & MpVehicleActionFlags &
  MpVehicleListActionProps

export function MissingPartVehicleActions({
  item,
  issueCount,
  noteCount = 0,
  deleteTargets,
  allItems,
  rowOpen = true,
  archiveMode = false,
  canUpdateStatus,
  canNotes,
  canEdit,
  canDelete,
  canComplete,
  completingVehicleId = null,
  completeRep,
  completeAllReps,
  onOpenNotes,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onCompleteAll,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy,
  shortageMissions = [],
  layout = 'inline'
}: Props) {
  const { t } = useLang()
  const { employees } = useEmployees()
  const { assignableEmployees, canAssignMissions } = useMyOrgScope(employees)
  const { canAssignFollowUp } = useMissingPartsUiPermissions()
  const openShortageMissions = useOpenShortageMissions()
  const canAct = archiveMode || rowOpen
  const target = completeRep ?? item
  const completeAll = completeAllReps && completeAllReps.length > 1
  const canArchiveSingle = canCompleteVehicle(target.vehicleId, allItems)
  const canArchiveAnyInGroup = completeAllReps?.some(rep => canCompleteVehicle(rep.vehicleId, allItems)) ?? false
  const groupBusy = completeAllReps?.some(rep => completingVehicleId === rep.vehicleId) ?? false
  const singleBusy = completingVehicleId === target.vehicleId
  const linkedMissions = shortageMissionsForParts(deleteTargets, shortageMissions)
  const canAssign =
    !archiveMode && rowOpen && canAssignMissions && Boolean(onAssignShortageMission) && assignableEmployees.length > 0
  const showMissionBtn = !archiveMode && rowOpen && (canAssign || linkedMissions.length > 0)

  const wrapClass =
    layout === 'stacked' ? 'flex flex-wrap items-center justify-end gap-1' : 'flex items-center justify-center gap-1'

  return (
    <div className={wrapClass}>
      {!archiveMode && rowOpen && canUpdateStatus && (
        <IconBtn
          title={t('mp.act.updateVehicle', { n: issueCount })}
          onClick={() => onUpdate(item)}
          className="text-cyan-300 hover:bg-cyan-500/20"
        >
          <Settings2 className={iconSize} />
        </IconBtn>
      )}
      {showMissionBtn && (
        <MpAssignShortageMissionButton
          parts={deleteTargets}
          employees={assignableEmployees}
          busy={assignMissionBusy}
          linkedMissions={linkedMissions}
          canAssign={canAssign}
          onOpenLinked={() => openShortageMissions(item.vin)}
          className={`relative rounded-md p-1.5 ${
            linkedMissions.length > 0
              ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/20'
              : 'text-amber-300 hover:bg-amber-500/20'
          }`}
          iconClassName={iconSize}
          onAssign={input => onAssignShortageMission?.(item, input)}
        />
      )}
      {/* Follow-up employees are now assigned inline in the edit/report modals */}
      {!archiveMode && rowOpen && canNotes && (
        <IconBtn
          title={t('mp.thread.open')}
          onClick={() => onOpenNotes(item)}
          className="text-cyan-400 hover:bg-cyan-500/20"
          count={noteCount}
        >
          <MessageSquare className={iconSize} />
        </IconBtn>
      )}
      {canAct && canEdit && (
        <IconBtn
          title={t('mp.edit.editVehicle', { n: issueCount })}
          onClick={() => onEdit(item)}
          className="text-slate-200 hover:bg-slate-700"
        >
          <Pencil className={iconSize} />
        </IconBtn>
      )}
      {canAct && canDelete && (
        <IconBtn
          title={t('common.delete')}
          onClick={() => onDeleteParts(deleteTargets)}
          className="text-red-300 hover:bg-red-500/20"
        >
          <Trash2 className={iconSize} />
        </IconBtn>
      )}
      {!archiveMode && rowOpen && canComplete && completeAll && onCompleteAll && (
        <IconBtn
          title={canArchiveAnyInGroup ? t('mp.vinListModal.pickToComplete') : t('mp.completeDisabledHint')}
          disabled={!canArchiveAnyInGroup || groupBusy}
          onClick={() => onCompleteAll(completeAllReps)}
          className="text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CheckCircle2 className={iconSize} />
        </IconBtn>
      )}
      {!archiveMode && rowOpen && canComplete && !completeAll && (
        <IconBtn
          title={canArchiveSingle ? t('mp.complete') : t('mp.completeDisabledHint')}
          disabled={!canArchiveSingle || singleBusy}
          onClick={() => onComplete(target)}
          className="text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CheckCircle2 className={iconSize} />
        </IconBtn>
      )}
    </div>
  )
}

function IconBtn({
  title,
  onClick,
  className,
  disabled,
  count,
  children
}: {
  title: string
  onClick: () => void
  className: string
  disabled?: boolean
  count?: number
  children: ReactNode
}) {
  const label = count != null && count > 99 ? '99+' : count
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative rounded-md p-1.5 ${className}`}
    >
      {children}
      {count != null && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[3px] text-[9px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]">
          {label}
        </span>
      )}
    </button>
  )
}
