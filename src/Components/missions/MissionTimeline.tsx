import { useLang } from '../../i18n/LanguageContext'
import { missionActivitySentence } from '../../Utils/missionActivity'
import { formatMissionDateTime } from '../../Utils/missionDisplay'
import { parseMissionReply } from '../../Utils/missionReply'
import type { MissionTimelineEntry } from '../../Types/mission'
import { MissionResponseFileTile } from './MissionResponseFileTile'

function ReplyBody({ body }: { body: string }) {
  const { t } = useLang()
  const reply = parseMissionReply(body)
  if (!reply) return <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{body}</p>
  const rows = [
    [t('missions.respond.temporary'), reply.temporary],
    [t('missions.respond.corrective'), reply.corrective],
    [t('missions.respond.confirmModels'), reply.models || t('missions.respond.noModels')],
    [t('missions.respond.confirmChassis'), reply.chassis || t('missions.respond.noChassis')],
    [t('missions.respond.confirmQty'), String(reply.affectedQty)]
  ]
  return (
    <div className="mt-2 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <p className="text-[11px] font-bold text-slate-500">{label}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-200">{value}</p>
        </div>
      ))}
    </div>
  )
}

type Props = {
  entries: MissionTimelineEntry[]
  loading: boolean
  error: string
}

export function MissionTimeline({ entries, loading, error }: Props) {
  const { t, lang } = useLang()
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
      <p className="text-[11px] font-bold text-slate-500">{t('missions.respond.timeline')}</p>
      {loading ? (
        <p className="mt-2 text-sm text-slate-500">{t('common.loading')}</p>
      ) : error ? (
        <p className="mt-2 text-sm font-bold text-red-300">{error}</p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('missions.respond.empty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map(item => (
            <li key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-slate-100">{item.authorName}</p>
                <p className="text-[11px] text-slate-500" dir="ltr">
                  {formatMissionDateTime(item.createdAt, lang)}
                </p>
              </div>
              {item.kind === 'change' ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-cyan-100">
                  {missionActivitySentence(item.field, item.fromValue, item.toValue, t, lang)}
                </p>
              ) : (
                <ReplyBody body={item.body} />
              )}
              {item.kind === 'reply' && item.attachments.length > 0 && (
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
  )
}
