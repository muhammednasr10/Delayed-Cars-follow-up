import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { buildMissingPartSummary } from '../../Utils/missingPartSummary'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  hasActiveFilter: boolean
  filteredVehicleCount: number
  tabVehicleCount: number
}

function StatPill({ label, value, tone = 'cyan' }: { label: string; value: string; tone?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate' }) {
  const tones = {
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
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

function BreakdownTable({
  title,
  rows,
  labelHeader,
  countHeader,
  renderLabel
}: {
  title: string
  rows: { label?: string; code?: string; vehicles: number; lines: number }[]
  labelHeader: string
  countHeader: string
  renderLabel: (row: { label?: string; code?: string }) => string
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
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{labelHeader}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.vehicles')}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{countHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-slate-500">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const key = row.label ?? row.code ?? '—'
                return (
                  <tr key={key} className="bg-slate-900/30">
                    <td className="table-cell px-3 py-2.5 text-slate-200">{renderLabel(row)}</td>
                    <td className="table-cell px-3 py-2.5 font-black text-white">{row.vehicles}</td>
                    <td className="table-cell px-3 py-2.5 font-black text-cyan-200">{row.lines}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MissingPartsSummaryTab({ items, reasons, departments, hasActiveFilter, filteredVehicleCount, tabVehicleCount }: Props) {
  const { t, lang } = useLang()
  const stats = useMemo(() => buildMissingPartSummary(items), [items])

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-black text-cyan-200">{t('mp.summary.title')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('mp.summary.hint')}</p>
        <p className="mt-2 text-sm font-bold text-cyan-300">
          {hasActiveFilter
            ? t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })
            : t('mp.filterVehicleCount', { n: filteredVehicleCount })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatPill label={t('mp.summary.vehicles')} value={String(stats.vehicleCount)} />
        <StatPill label={t('mp.summary.lines')} value={String(stats.lineCount)} tone="slate" />
        <StatPill label={t('mp.summary.pendingVehicles')} value={String(stats.pendingInstallVehicles)} tone="amber" />
        <StatPill label={t('mp.summary.pendingLines')} value={String(stats.pendingInstallLines)} tone="rose" />
        <StatPill label={t('mp.summary.readyArchive')} value={String(stats.fullyInstalledVehicles)} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreakdownTable
          title={t('mp.summary.byModel')}
          rows={stats.byModel}
          labelHeader={t('mp.cols.model')}
          countHeader={t('mp.summary.lines')}
          renderLabel={row => row.label ?? '—'}
        />
        <BreakdownTable
          title={t('mp.summary.byDepartment')}
          rows={stats.byDepartment}
          labelHeader={t('mp.cols.department')}
          countHeader={t('mp.summary.lines')}
          renderLabel={row => mpLookupLabel(departments, row.code ?? '', lang)}
        />
        <BreakdownTable
          title={t('mp.summary.byReason')}
          rows={stats.byReason}
          labelHeader={t('mp.cols.reasonClass')}
          countHeader={t('mp.summary.lines')}
          renderLabel={row => mpLookupLabel(reasons, row.code ?? '', lang)}
        />
        <BreakdownTable
          title={t('mp.summary.byStation')}
          rows={stats.byStation.slice(0, 12)}
          labelHeader={t('mp.cols.station')}
          countHeader={t('mp.summary.lines')}
          renderLabel={row => row.label ?? '—'}
        />
      </div>
    </div>
  )
}
