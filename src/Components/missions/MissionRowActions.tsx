import { MessageSquareReply, Pencil, Trash2, UserRoundCog } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'

type Props = {
  showRespond?: boolean
  showDelegate?: boolean
  showEdit?: boolean
  showDelete?: boolean
  onRespond?: () => void
  onDelegate?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MissionRowActions({
  showRespond,
  showDelegate,
  showEdit,
  showDelete,
  onRespond,
  onDelegate,
  onEdit,
  onDelete
}: Props) {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center gap-1">
      {showRespond && onRespond && (
        <button
          type="button"
          onClick={onRespond}
          className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700"
          title={t('missions.respond.open')}
        >
          <MessageSquareReply className="h-4 w-4" />
        </button>
      )}
      {showDelegate && onDelegate && (
        <button
          type="button"
          onClick={onDelegate}
          className="rounded-lg bg-slate-800 p-2 text-amber-300 hover:bg-slate-700"
          title={t('missions.delegate.open')}
        >
          <UserRoundCog className="h-4 w-4" />
        </button>
      )}
      {showEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700"
          title={t('missions.editMission')}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700"
          title={t('common.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
