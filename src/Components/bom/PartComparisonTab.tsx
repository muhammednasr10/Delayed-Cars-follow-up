import { Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePartNumberComparison } from '../../hooks/usePartNumberComparison'
import { DuplicateBadge } from './DuplicateBadge'
import { inputCls } from '../FormField'

export function PartComparisonTab() {
  const { t } = useLang()
  const { filters, setFilters, items, total, loading, error } = usePartNumberComparison({ page: 1, pageSize: 50 })

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-wrap gap-3 p-4">
        <label className="min-w-[12rem] flex-1">
          <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{t('bom.search')}</span>
          <div className="relative">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              className={`${inputCls()} ps-9`}
              dir="ltr"
              value={filters.search ?? ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={Boolean(filters.duplicatesOnly)}
            onChange={e => setFilters(f => ({ ...f, duplicatesOnly: e.target.checked, page: 1 }))}
          />
          <span className="text-xs">{t('bom.duplicatesOnly')}</span>
        </label>
        <select
          className={inputCls()}
          value={filters.status ?? ''}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">{t('bom.allStatuses')}</option>
          <option value="unique">unique</option>
          <option value="duplicate">duplicate</option>
          <option value="possible_duplicate">possible_duplicate</option>
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="table-cell">{t('bom.partNumber')}</th>
              <th className="table-cell">{t('bom.normalized')}</th>
              <th className="table-cell">{t('bom.occurrences')}</th>
              <th className="table-cell">{t('bom.stations')}</th>
              <th className="table-cell">{t('bom.models')}</th>
              <th className="table-cell">{t('bom.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="table-cell">
                  {t('common.loading')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-b border-slate-800/80">
                  <td className="table-cell font-black text-cyan-300" dir="ltr">
                    {row.part_number}
                  </td>
                  <td className="table-cell font-mono text-xs text-slate-400" dir="ltr">
                    {row.normalized_part_number}
                  </td>
                  <td className="table-cell">{row.occurrence_count}</td>
                  <td className="table-cell text-xs text-slate-400">{row.station_count}</td>
                  <td className="table-cell text-xs text-slate-400">{row.model_count}</td>
                  <td className="table-cell">
                    <DuplicateBadge status={row.comparison_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{t('bom.rowCount', { n: total })}</p>
    </div>
  )
}
