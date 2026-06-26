import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { dpLookupLabel } from '../../Utils/dpLookupLabel'
import { buildDamagedPartSummary, sliceTopRows, type DamagedPartRankRow } from '../../Utils/damagedPartSummary'
import type { DamagedPartFilters, DamagedPartRecord } from '../../Types/damagedPart'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  items: DamagedPartRecord[]
  filters: DamagedPartFilters
  reasons: MpLookupOption[]
  decisions: MpLookupOption[]
  hasActiveFilter: boolean
}

function StatPill({ label, value, tone = 'orange' }: { label: string; value: string; tone?: 'orange' | 'amber' | 'cyan' | 'rose' | 'slate' }) {
  const tones = {
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200'
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}

function RankTable({
  title,
  rows,
  labelHeader,
  renderLabel
}: {
  title: string
  rows: DamagedPartRankRow[]
  labelHeader: string
  renderLabel: (row: DamagedPartRankRow) => string
}) {
  const { t } = useLang()

  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h4 className="text-sm font-black text-slate-200">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">#</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{labelHeader}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('damagedParts.summary.records')}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('damagedParts.summary.quantity')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-slate-500">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.label}-${row.code ?? ''}-${idx}`} className="bg-slate-900/30">
                  <td className="table-cell px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
                  <td className="table-cell px-3 py-2.5 text-slate-200">{renderLabel(row)}</td>
                  <td className="table-cell px-3 py-2.5 font-black text-white">{row.records}</td>
                  <td className="table-cell px-3 py-2.5 font-black text-orange-200">{row.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DamagedPartsSummaryTab({ items, filters, reasons, decisions, hasActiveFilter }: Props) {
  const { t, lang } = useLang()
  const stats = useMemo(() => buildDamagedPartSummary(items), [items])
  const topN = filters.topLimit

  const topParts = useMemo(() => sliceTopRows(stats.byPart, topN), [stats.byPart, topN])
  const topCausers = useMemo(() => sliceTopRows(stats.byCauser, topN), [stats.byCauser, topN])
  const topModels = useMemo(() => sliceTopRows(stats.byModel, topN), [stats.byModel, topN])

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <h3 className="text-sm font-black text-orange-200">{t('damagedParts.summary.title')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('damagedParts.summary.hint')}</p>
        {hasActiveFilter && <p className="mt-2 text-xs font-bold text-amber-300">{t('damagedParts.summary.filteredNote')}</p>}
        <p className="mt-1 text-xs text-slate-500">{t('damagedParts.summary.topNote', { n: topN })}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill label={t('damagedParts.summary.recordCount')} value={String(stats.recordCount)} />
        <StatPill label={t('damagedParts.summary.totalQuantity')} value={String(stats.totalQuantity)} tone="amber" />
        <StatPill label={t('damagedParts.summary.uniqueParts')} value={String(stats.uniqueParts)} tone="cyan" />
        <StatPill label={t('damagedParts.summary.uniqueCausers')} value={String(stats.uniqueCausers)} tone="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RankTable
          title={t('damagedParts.summary.topParts', { n: topN })}
          rows={topParts}
          labelHeader={t('damagedParts.cols.part')}
          renderLabel={row => row.label}
        />
        <RankTable
          title={t('damagedParts.summary.topCausers', { n: topN })}
          rows={topCausers}
          labelHeader={t('damagedParts.cols.causer')}
          renderLabel={row => row.label}
        />
        <RankTable
          title={t('damagedParts.summary.topModels', { n: topN })}
          rows={topModels}
          labelHeader={t('damagedParts.cols.model')}
          renderLabel={row => row.label}
        />
        <RankTable
          title={t('damagedParts.summary.byReason')}
          rows={stats.byReason}
          labelHeader={t('damagedParts.cols.reason')}
          renderLabel={row => dpLookupLabel(reasons, row.code ?? row.label, lang)}
        />
        <RankTable
          title={t('damagedParts.summary.byDecision')}
          rows={stats.byDecision}
          labelHeader={t('damagedParts.cols.finalDecision')}
          renderLabel={row => dpLookupLabel(decisions, row.code ?? row.label, lang)}
        />
        <RankTable
          title={t('damagedParts.summary.byMonth')}
          rows={stats.byMonth}
          labelHeader={t('damagedParts.summary.month')}
          renderLabel={row => row.label}
        />
      </div>
    </div>
  )
}
