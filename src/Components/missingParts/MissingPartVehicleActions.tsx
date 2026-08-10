import { type ReactNode } from 'react'
import { CheckCircle2, MessageSquare, Pencil, Settings2, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import { canCompleteVehicle, iconSize } from '../../Utils/missingPartPageUtils'

type Props = {
  item: MissingPartDetail
  issueCount: number
  deleteTargets: MissingPartDetail[]
  allItems: MissingPartDetail[]
  rowOpen?: boolean
  archiveMode?: boolean
  canUpdateStatus: boolean
  canNotes: boolean
  canEdit: boolean
  canDelete: boolean
  canComplete: boolean
  completingVehicleId?: string | null
  completeRep?: MissingPartDetail
  completeAllReps?: MissingPartDetail[]
  onOpenNotes: (part: MissingPartDetail) => void
  onEdit: (part: MissingPartDetail) => void
  onUpdate: (part: MissingPartDetail) => void
  onDeleteParts: (parts: MissingPartDetail[]) => void
  onComplete: (part: MissingPartDetail) => void
  onCompleteAll?: (parts: MissingPartDetail[]) => void
  layout?: 'inline' | 'stacked'
}

export function MissingPartVehicleActions({
  item,
  issueCount,
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
  layout = 'inline'
}: Props) {
  const { t } = useLang()
  const canAct = archiveMode || rowOpen
  const target = completeRep ?? item
  const completeAll = completeAllReps && completeAllReps.length > 1
  const canArchiveSingle = canCompleteVehicle(target.vehicleId, allItems)
  const canArchiveAnyInGroup = completeAllReps?.some(rep => canCompleteVehicle(rep.vehicleId, allItems)) ?? false
  const groupBusy = completeAllReps?.some(rep => completingVehicleId === rep.vehicleId) ?? false
  const singleBusy = completingVehicleId === target.vehicleId

  const wrapClass =
    layout === 'stacked'
      ? 'flex flex-wrap items-center justify-end gap-1'
      : 'flex items-center justify-center gap-1'

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
      {!archiveMode && rowOpen && canNotes && (
        <IconBtn title={t('mp.thread.open')} onClick={() => onOpenNotes(item)} className="text-cyan-400 hover:bg-cyan-500/20">
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
          title={canArchiveAnyInGroup ? t('mp.completeAllConfirm') : t('mp.completeDisabledHint')}
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
  children
}: {
  title: string
  onClick: () => void
  className: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`rounded-md p-1.5 ${className}`}>
      {children}
    </button>
  )
}
