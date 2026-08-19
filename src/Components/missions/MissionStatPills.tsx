import { useLang } from '../../i18n/LanguageContext'
import type { MissionListStats } from '../../Utils/missionDisplay'

type Tone = 'slate' | 'amber' | 'blue' | 'emerald' | 'red'

function StatPill({ label, value, tone = 'slate' }: { label: string; value: string; tone?: Tone }) {
  const tones = {
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-100'
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}

export function MissionStatPills({ stats }: { stats: MissionListStats }) {
  const { t } = useLang()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatPill label={t('missions.stats.total')} value={String(stats.total)} />
      <StatPill label={t('missions.status.pending')} value={String(stats.pending)} tone="amber" />
      <StatPill label={t('missions.status.in_progress')} value={String(stats.inProgress)} tone="blue" />
      <StatPill label={t('missions.status.completed')} value={String(stats.completed)} tone="emerald" />
      <StatPill label={t('missions.stats.overdue')} value={String(stats.overdue)} tone="red" />
    </div>
  )
}

export function MissionListAlerts({
  setupRequired,
  success,
  error
}: {
  setupRequired: boolean
  success: string
  error: string
}) {
  const { t } = useLang()
  return (
    <>
      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('missions.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('missions.setupHint')}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </div>
      )}
      {error && !setupRequired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}
    </>
  )
}
