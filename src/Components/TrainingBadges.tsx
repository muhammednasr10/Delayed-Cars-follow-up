import { useLang } from '../i18n/LanguageContext'
import type { TrainingLevel, TrainingStatus } from '../Types/enums'

const base = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 whitespace-nowrap'

const LEVEL_CLASSES: Record<TrainingLevel, string> = {
  level_0: 'bg-slate-600/20 text-slate-300 ring-slate-500/30',
  level_1: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  level_2: 'bg-yellow-500/15 text-yellow-200 ring-yellow-400/30',
  level_3: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  level_4: 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30'
}

const STATUS_CLASSES: Record<TrainingStatus, string> = {
  not_trained: 'bg-red-500/15 text-red-200 ring-red-400/30',
  in_training: 'bg-yellow-500/15 text-yellow-200 ring-yellow-400/30',
  qualified: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  expired: 'bg-orange-500/15 text-orange-200 ring-orange-400/30',
  suspended: 'bg-slate-800 text-slate-300 ring-slate-600'
}

export function TrainingLevelBadge({ level }: { level: TrainingLevel }) {
  const { t } = useLang()
  return <span className={`${base} ${LEVEL_CLASSES[level]}`}>{t(`trainingLevel.${level}`)}</span>
}

export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  const { t } = useLang()
  return <span className={`${base} ${STATUS_CLASSES[status]}`}>{t(`trainingStatus.${status}`)}</span>
}

export function QualificationBadge({ qualified }: { qualified: boolean }) {
  const { t } = useLang()
  const cls = qualified ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30' : 'bg-red-500/15 text-red-200 ring-red-400/30'
  return <span className={`${base} ${cls}`}>{qualified ? t('training.qualifiedBadge') : t('trainingStatus.not_trained')}</span>
}

// 1..5 rating shown as filled/empty stars (RTL-safe, no locale text).
export function RatingBadge({ rating }: { rating: number | null }) {
  const { t } = useLang()
  if (!rating) return <span className="text-xs text-slate-500">{t('training.rec.noRating')}</span>
  const tone = rating >= 4 ? 'text-emerald-300' : rating >= 3 ? 'text-yellow-300' : 'text-orange-300'
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${tone}`} dir="ltr" title={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? '' : 'text-slate-600'}>★</span>
      ))}
    </span>
  )
}
