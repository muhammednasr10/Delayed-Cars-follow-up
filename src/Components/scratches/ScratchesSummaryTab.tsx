import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { ScratchRecord, ScratchSeverity } from '../../Types/scratch'

const SEVERITIES: ScratchSeverity[] = ['light', 'medium', 'severe']

type Props = {
  items: ScratchRecord[]
}

function StatPill({ label, value, tone = 'rose' }: { label: string; value: string; tone?: 'rose' | 'emerald' | 'amber' | 'red' | 'slate' }) {
  const tones = {
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-100',
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200'
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

export function ScratchesSummaryTab({ items }: Props) {
  const { t } = useLang()

  const stats = useMemo(() => {
    const bySeverity = Object.fromEntries(SEVERITIES.map(s => [s, 0])) as Record<ScratchSeverity, number>
    const byArea = new Map<string, number>()

    for (const row of items) {
      bySeverity[row.severity] += 1
      const area = row.bodyArea.trim() || '—'
      byArea.set(area, (byArea.get(area) ?? 0) + 1)
    }

    const topAreas = [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { total: items.length, bySeverity, topAreas }
  }, [items])

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <h3 className="text-sm font-black text-rose-200">{t('scratches.summaryTitle')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('scratches.summaryHint')}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill label={t('scratches.summary.total')} value={String(stats.total)} />
          <StatPill label={t('scratches.severity.light')} value={String(stats.bySeverity.light)} tone="emerald" />
          <StatPill label={t('scratches.severity.medium')} value={String(stats.bySeverity.medium)} tone="amber" />
          <StatPill label={t('scratches.severity.severe')} value={String(stats.bySeverity.severe)} tone="red" />
        </div>
      </div>

      <div className="card-industrial overflow-x-auto">
        <div className="border-b border-slate-800 px-4 py-3">
          <h4 className="text-sm font-black text-slate-200">{t('scratches.summary.topAreas')}</h4>
        </div>
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('scratches.cols.area')}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('scratches.summary.count')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {stats.topAreas.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-slate-500">
                  {t('scratches.empty')}
                </td>
              </tr>
            ) : (
              stats.topAreas.map(([area, count]) => (
                <tr key={area} className="bg-slate-900/30">
                  <td className="table-cell px-3 py-2.5 text-slate-200">{area}</td>
                  <td className="table-cell px-3 py-2.5 font-black text-white">{count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
