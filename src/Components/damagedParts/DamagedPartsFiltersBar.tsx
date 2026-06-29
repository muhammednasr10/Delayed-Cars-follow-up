import { Filter, RotateCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { dpLookupLabel } from '../../Utils/dpLookupLabel'
import { UNKNOWN_CAUSER_FILTER } from '../../Utils/damagedPartCauser'
import type { DamagedPartFilters, DamagedPartRecord } from '../../Types/damagedPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Employee } from '../../Types/employee'

type Props = {
  filters: DamagedPartFilters
  onChange: (patch: Partial<DamagedPartFilters>) => void
  onReset: () => void
  items: DamagedPartRecord[]
  reasons: MpLookupOption[]
  decisions: MpLookupOption[]
  employees: Employee[]
  filteredCount: number
  totalCount: number
}

export function DamagedPartsFiltersBar({
  filters,
  onChange,
  onReset,
  items,
  reasons,
  decisions,
  employees,
  filteredCount,
  totalCount
}: Props) {
  const { t, lang } = useLang()

  const modelOptions = [...new Set(items.map(i => i.modelName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'))
  const causerIds = new Set(items.map(i => i.causedByEmployeeId).filter(Boolean) as string[])
  const hasUnknownCausers = items.some(i => !i.causedByEmployeeId)
  const causerOptions = employees
    .filter(e => causerIds.has(e.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))

  return (
    <div className="card-industrial space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-black text-orange-200">
          <Filter className="h-4 w-4" />
          {t('damagedParts.filters.title')}
        </div>
        <p className="text-xs font-bold text-slate-400">
          {filteredCount === totalCount
            ? t('damagedParts.filters.count', { n: filteredCount })
            : t('damagedParts.filters.countFiltered', { n: filteredCount, total: totalCount })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <input
          className="input-dark"
          placeholder={t('damagedParts.filters.searchPh')}
          value={filters.search}
          onChange={e => onChange({ search: e.target.value })}
        />

        <select className="input-dark" value={filters.modelName} onChange={e => onChange({ modelName: e.target.value })}>
          <option value="">{t('damagedParts.filters.allModels')}</option>
          {modelOptions.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select className="input-dark" value={filters.damageReason} onChange={e => onChange({ damageReason: e.target.value })}>
          <option value="">{t('damagedParts.filters.allReasons')}</option>
          {reasons.map(r => (
            <option key={r.code} value={r.code}>
              {dpLookupLabel(reasons, r.code, lang)}
            </option>
          ))}
        </select>

        <select className="input-dark" value={filters.finalDecision} onChange={e => onChange({ finalDecision: e.target.value })}>
          <option value="">{t('damagedParts.filters.allDecisions')}</option>
          {decisions.map(d => (
            <option key={d.code} value={d.code}>
              {dpLookupLabel(decisions, d.code, lang)}
            </option>
          ))}
        </select>

        <select
          className="input-dark"
          value={filters.causedByEmployeeId}
          onChange={e => onChange({ causedByEmployeeId: e.target.value })}
        >
          <option value="">{t('damagedParts.filters.allCausers')}</option>
          {hasUnknownCausers && (
            <option value={UNKNOWN_CAUSER_FILTER}>{t('damagedParts.unknownCauser')}</option>
          )}
          {causerOptions.map(e => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="input-dark"
          value={filters.dateFrom}
          onChange={e => onChange({ dateFrom: e.target.value })}
          title={t('damagedParts.filters.dateFrom')}
        />

        <input
          type="date"
          className="input-dark"
          value={filters.dateTo}
          onChange={e => onChange({ dateTo: e.target.value })}
          title={t('damagedParts.filters.dateTo')}
        />

        <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2">
          <span className="shrink-0 text-xs font-bold text-slate-400">{t('damagedParts.filters.topLimit')}</span>
          <input
            type="number"
            min={1}
            max={100}
            className="w-full min-w-0 bg-transparent text-sm font-black text-orange-200 outline-none"
            value={filters.topLimit}
            onChange={e => onChange({ topLimit: Math.max(1, Math.min(100, Number(e.target.value) || 10)) })}
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          {t('damagedParts.filters.reset')}
        </button>
      </div>
    </div>
  )
}
