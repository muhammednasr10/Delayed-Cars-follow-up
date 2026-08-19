import { useEffect, useState } from 'react'
import { ListTodo, MessageSquareReply, UserRoundCog, Car } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { formatPeopleList, missionCreatorLabel, missionShortageLabel } from '../../Utils/missionPeople'
import { isMissionOverdue } from '../../Utils/missionDue'
import { isRecurrenceSeriesRoot, nextAutoRecurrenceDueDate } from '../../Utils/missionRecurrence'
import { getTeamMissionResponses } from '../../services/missionResponseService'
import { formatMissionDate, formatMissionDateTime, missionRecurrenceLabel } from '../../Utils/missionDisplay'
import { MissionResponseFileTile } from './MissionResponseFileTile'
import type { TeamMission, TeamMissionResponse } from '../../Types/mission'

type Props = {
  mission: TeamMission | null
  onClose: () => void
  canDelegate?: boolean
  onDelegate?: () => void
  canRespond?: boolean
  onRespond?: () => void
  onOpenShortage?: () => void
  refreshKey?: number
}

function Field({ label, value, dir, preWrap }: { label: string; value: string; dir?: string; preWrap?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd
        className={`mt-1 text-sm font-medium text-slate-100 ${preWrap ? 'whitespace-pre-wrap' : ''}`}
        dir={dir}
      >
        {value || '—'}
      </dd>
    </div>
  )
}

export function MissionDetailModal({
  mission,
  onClose,
  canDelegate,
  onDelegate,
  canRespond,
  onRespond,
  onOpenShortage,
  refreshKey = 0
}: Props) {
  const { t, lang } = useLang()
  const [responses, setResponses] = useState<TeamMissionResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [responsesError, setResponsesError] = useState('')

  useEffect(() => {
    if (!mission) {
      setResponses([])
      setResponsesError('')
      setLoadingResponses(false)
      return
    }
    let cancelled = false
    setLoadingResponses(true)
    setResponsesError('')
    void getTeamMissionResponses(mission.id)
      .then(rows => {
        if (!cancelled) setResponses(rows)
      })
      .catch(e => {
        if (!cancelled) {
          setResponses([])
          setResponsesError(e instanceof Error ? e.message : t('common.error'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResponses(false)
      })
    return () => {
      cancelled = true
    }
  }, [mission?.id, refreshKey, t])

  if (!mission) return null

  const details = mission.description?.trim() || ''
  const notes = mission.notes?.trim() || ''
  const overdue = isMissionOverdue(mission)
  const nextDue = isRecurrenceSeriesRoot(mission)
    ? nextAutoRecurrenceDueDate(mission.dueDate, mission.recurrenceType)
    : null
  const shortage = missionShortageLabel(mission.sourceVin, mission.sourceModelName)

  return (
    <Modal
      open={Boolean(mission)}
      title={t('missions.detail.title')}
      subtitle={mission.title}
      icon={<ListTodo className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {canRespond && onRespond && (
            <button
              type="button"
              onClick={onRespond}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20"
            >
              <MessageSquareReply className="h-4 w-4" />
              {t('missions.respond.open')}
            </button>
          )}
          {canDelegate && onDelegate && (
            <button
              type="button"
              onClick={onDelegate}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
            >
              <UserRoundCog className="h-4 w-4" />
              {t('missions.delegate.open')}
            </button>
          )}
          {shortage && onOpenShortage && (
            <button
              type="button"
              onClick={onOpenShortage}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
            >
              <Car className="h-4 w-4" />
              {t('missions.detail.openShortage')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.close')}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={t('missions.cols.title')} value={mission.title} />
        <Field
          label={t('missions.cols.assignee')}
          value={formatPeopleList(mission.assignees.length ? mission.assignees : [{ id: mission.assigneeId, name: mission.assigneeName, code: mission.assigneeCode }])}
        />
        <Field
          label={t('missions.cols.description')}
          value={details || t('missions.detail.noDescription')}
          preWrap
        />
        {notes && <Field label={t('common.notes')} value={notes} preWrap />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('missions.cols.priority')} value={t(`missions.priority.${mission.priority}`)} />
          <Field
            label={t('missions.cols.dueDate')}
            value={overdue ? `${formatMissionDate(mission.dueDate, lang)} · ${t('missions.overdue')}` : formatMissionDate(mission.dueDate, lang)}
            dir="ltr"
          />
          <Field
            label={t('missions.cols.recurrence')}
            value={missionRecurrenceLabel(mission, t)}
          />
          {nextDue && (
            <Field label={t('missions.detail.nextOccurrence')} value={formatMissionDate(nextDue, lang)} dir="ltr" />
          )}
          <Field label={t('missions.cols.status')} value={t(`missions.status.${mission.status}`)} />
          <Field label={t('missions.detail.createdAt')} value={formatMissionDateTime(mission.createdAt, lang)} dir="ltr" />
          <Field label={t('missions.cols.createdBy')} value={missionCreatorLabel(mission.createdByName)} />
          {shortage && <Field label={t('missions.detail.shortage')} value={shortage} dir="ltr" />}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
          <p className="text-[11px] font-bold text-slate-500">{t('missions.respond.timeline')}</p>
          {loadingResponses ? (
            <p className="mt-2 text-sm text-slate-500">{t('common.loading')}</p>
          ) : responsesError ? (
            <p className="mt-2 text-sm font-bold text-red-300">{responsesError}</p>
          ) : responses.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('missions.respond.empty')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {responses.map(item => (
                <li key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-slate-100">{item.authorName}</p>
                    <p className="text-[11px] text-slate-500" dir="ltr">
                      {formatMissionDateTime(item.createdAt, lang)}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{item.body}</p>
                  {item.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.attachments.map(file => (
                        <MissionResponseFileTile
                          key={file.id}
                          url={file.url}
                          fileName={file.fileName}
                          mimeType={file.mimeType}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
