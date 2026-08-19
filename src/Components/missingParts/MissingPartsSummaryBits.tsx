import { useLang } from '../../i18n/LanguageContext'
import { orgPathFromLeaf } from '../../Utils/employeeOrgPicker'
import type { FactoryOrgUnit, FactoryOrgUnitKind } from '../../Types/factoryOrg'
import type { SummaryBreakdownRow } from '../../Utils/missingPartSummary'

export type DepartmentRollupLevel = 'raw' | FactoryOrgUnitKind

export function SummaryStatPill({
  label,
  value,
  tone = 'cyan'
}: {
  label: string
  value: string | number
  tone?: 'cyan' | 'amber' | 'rose' | 'emerald' | 'violet' | 'slate'
}) {
  const tones = {
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200'
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  )
}

export function DepartmentLevelFilter({
  level,
  onChange
}: {
  level: DepartmentRollupLevel
  onChange: (value: DepartmentRollupLevel) => void
}) {
  const { t } = useLang()
  const options: { value: DepartmentRollupLevel; label: string }[] = [
    { value: 'raw', label: t('mp.summary.deptLevelRaw') },
    { value: 'administration', label: t('mp.summary.deptLevelAdministration') },
    { value: 'section', label: t('mp.summary.deptLevelSection') },
    { value: 'subsection', label: t('mp.summary.deptLevelSubsection') }
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black text-slate-300">{t('mp.summary.deptLevelTitle')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('mp.summary.deptLevelHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                level === option.value
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function rollupDepartmentCode(
  code: string | null | undefined,
  level: DepartmentRollupLevel,
  units: FactoryOrgUnit[]
): string | null {
  const key = code?.trim() || ''
  if (!key || key === '—' || level === 'raw') return code ?? null
  const path = orgPathFromLeaf(key, units)
  if (path.length === 0) return code ?? null
  const byId = new Map(units.map(u => [u.id, u]))
  const target = path
    .map(id => byId.get(id))
    .filter((u): u is FactoryOrgUnit => Boolean(u))
    .find(u => u.unitKind === level)
  return target?.id ?? path[path.length - 1] ?? code ?? null
}

export function SummaryRankTable({
  title,
  rows,
  labelHeader,
  renderLabel,
  showPending
}: {
  title: string
  rows: SummaryBreakdownRow[]
  labelHeader: string
  renderLabel: (row: SummaryBreakdownRow) => string
  showPending?: boolean
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
              <th className="table-cell w-10 px-2 py-2.5 font-black text-slate-500">#</th>
              <th className="table-cell px-3 py-2.5 text-start font-black text-slate-400">{labelHeader}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.rankVehicles')}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.rankLines')}</th>
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.rankQty')}</th>
              {showPending && (
                <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.rankPending')}</th>
              )}
              <th className="table-cell px-3 py-2.5 font-black text-slate-400">{t('mp.summary.rankShare')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showPending ? 7 : 6} className="px-4 py-10 text-slate-500">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.key}-${idx}`} className="bg-slate-900/30 hover:bg-slate-800/35">
                  <td className="table-cell px-2 py-2.5 font-mono text-xs text-slate-500">{idx + 1}</td>
                  <td className="table-cell max-w-[14rem] px-3 py-2.5 text-start font-bold text-slate-100">
                    <span className="line-clamp-2">{renderLabel(row)}</span>
                  </td>
                  <td className="table-cell px-3 py-2.5 font-black tabular-nums text-white">{row.vehicles}</td>
                  <td className="table-cell px-3 py-2.5 font-black tabular-nums text-cyan-200">{row.lines}</td>
                  <td className="table-cell px-3 py-2.5 font-black tabular-nums text-amber-200">{row.remainingQty}</td>
                  {showPending && (
                    <td className="table-cell px-3 py-2.5 font-black tabular-nums text-rose-200">{row.pendingLines}</td>
                  )}
                  <td className="table-cell px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500/80"
                          style={{ width: `${Math.min(100, row.sharePct)}%` }}
                        />
                      </div>
                      <span className="min-w-[2.5rem] text-xs font-bold tabular-nums text-slate-400">
                        {row.sharePct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
