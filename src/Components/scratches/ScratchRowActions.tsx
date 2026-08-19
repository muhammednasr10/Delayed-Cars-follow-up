import { type ReactNode } from 'react'
import { CheckCircle2, MessageSquare, Pencil, Settings2, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { MpIssueFollowUpButton } from '../missingParts/MpIssueFollowUpButton'
import { MpAssignShortageMissionButton } from '../missingParts/MpAssignShortageMissionButton'
import { shortageMissionsForParts } from '../../Utils/shortageMissionLinks'
import { useOpenShortageMissions } from '../../hooks/useOpenShortageMissions'
import type { ScratchRecord } from '../../Types/scratch'
import type { MpFollowUpAssignment, ShortageMissionAssignInput } from '../../Types/mpVehicleActions'
import type { ShortageMissionLink } from '../../Types/mission'

const iconSize = 'h-[18px] w-[18px]'

type Props = {
  row: ScratchRecord
  canEdit?: boolean
  canDelete?: boolean
  canUpdate?: boolean
  canNotes?: boolean
  canComplete?: boolean
  canFollowUp?: boolean
  disabled?: boolean
  noteCount?: number
  assignMissionBusy?: boolean
  scratchMissions?: ShortageMissionLink[]
  onEdit?: () => void
  onUpdate?: () => void
  onDelete?: () => void
  onOpenNotes?: () => void
  onComplete?: () => void
  onFollowUp?: (assignment: MpFollowUpAssignment) => void
  onAssignMission?: (input: ShortageMissionAssignInput) => void | Promise<void>
}

export function ScratchRowActions({
  row,
  canEdit,
  canDelete,
  canUpdate,
  canNotes,
  canComplete,
  canFollowUp,
  disabled,
  noteCount = 0,
  assignMissionBusy,
  scratchMissions = [],
  onEdit,
  onUpdate,
  onDelete,
  onOpenNotes,
  onComplete,
  onFollowUp,
  onAssignMission
}: Props) {
  const { t } = useLang()
  const { employees } = useEmployees()
  const { assignableEmployees, canAssignMissions } = useMyOrgScope(employees)
  const openScratchMissions = useOpenShortageMissions()
  const resolved = Boolean(row.resolvedAt)
  const linkedMissions = shortageMissionsForParts([{ id: row.id, vehicleId: row.id, vin: row.vin }], scratchMissions)
  const canAssign = Boolean(onAssignMission) && canAssignMissions && assignableEmployees.length > 0
  const showMission = canAssign || linkedMissions.length > 0
  const showComplete = Boolean(canComplete && row.willStop && !resolved && onComplete)
  const hasAny =
    (canUpdate && onUpdate) ||
    showMission ||
    (canFollowUp && onFollowUp && !resolved) ||
    (canNotes && onOpenNotes) ||
    (canEdit && onEdit) ||
    (canDelete && onDelete) ||
    showComplete

  if (!hasAny) return <span className="text-slate-600">—</span>

  return (
    <div className="flex items-center justify-center gap-1">
      {canUpdate && onUpdate && !resolved && (
        <IconBtn
          title={t('scratches.updateIssue')}
          disabled={disabled}
          onClick={onUpdate}
          className="text-cyan-300 hover:bg-cyan-500/20"
        >
          <Settings2 className={iconSize} />
        </IconBtn>
      )}
      {showMission && onAssignMission && (
        <MpAssignShortageMissionButton
          parts={[]}
          employees={assignableEmployees}
          busy={assignMissionBusy}
          linkedMissions={linkedMissions}
          canAssign={canAssign}
          onOpenLinked={() => openScratchMissions(row.vin)}
          defaultTitle={[row.vin, row.notes, row.bodyArea].filter(Boolean).join(' · ')}
          className={`relative rounded-md p-1.5 ${
            linkedMissions.length > 0
              ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/20'
              : 'text-amber-300 hover:bg-amber-500/20'
          }`}
          iconClassName={iconSize}
          onAssign={onAssignMission}
        />
      )}
      {canFollowUp && onFollowUp && !resolved && (
        <MpIssueFollowUpButton
          assignment={{
            completingDepartment: row.completingDepartment ?? '',
            followUpEmployeeId: row.followUpEmployeeId ?? ''
          }}
          employees={employees}
          title={t('mp.followUp.open')}
          className={`relative rounded-md p-1.5 ${
            row.completingDepartment || row.followUpEmployeeId
              ? 'bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/20'
              : 'text-cyan-300 hover:bg-cyan-500/20'
          }`}
          iconClassName={iconSize}
          onSave={onFollowUp}
        />
      )}
      {canNotes && onOpenNotes && (
        <IconBtn
          title={t('mp.thread.open')}
          disabled={disabled}
          onClick={onOpenNotes}
          className="text-cyan-400 hover:bg-cyan-500/20"
          count={noteCount}
        >
          <MessageSquare className={iconSize} />
        </IconBtn>
      )}
      {canEdit && onEdit && (
        <IconBtn
          title={t('common.edit')}
          disabled={disabled}
          onClick={onEdit}
          className="text-slate-200 hover:bg-slate-700"
        >
          <Pencil className={iconSize} />
        </IconBtn>
      )}
      {canDelete && onDelete && (
        <IconBtn
          title={t('common.delete')}
          disabled={disabled}
          onClick={onDelete}
          className="text-red-300 hover:bg-red-500/20"
        >
          <Trash2 className={iconSize} />
        </IconBtn>
      )}
      {showComplete && (
        <IconBtn
          title={t('scratches.complete')}
          disabled={disabled}
          onClick={onComplete!}
          className="text-emerald-400 hover:bg-emerald-500/20"
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
      {count != null && count > 0 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[3px] text-[9px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]">
          {label}
        </span>
      )}
    </button>
  )
}
