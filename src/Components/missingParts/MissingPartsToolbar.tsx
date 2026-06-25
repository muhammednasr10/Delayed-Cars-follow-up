import { AlertTriangle, Archive, PlusCircle, RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { MissingPartFilters } from '../../Types/missingPart'

export type ListTab = 'active' | 'history'

type Props = {
  listTab: ListTab
  onListTabChange: (tab: ListTab) => void
  activeCount: number
  historyCount: number
  filters: MissingPartFilters
  onFiltersChange: (patch: Partial<MissingPartFilters>) => void
  stationOptions: string[]
  modelOptions: string[]
  departmentFilterCodes: string[]
  departments: MpLookupOption[]
  filteredVehicleCount: number
  tabVehicleCount: number
  hasActiveFilter: boolean
  canReport: boolean
  role: string
  onRefresh: () => void
  onReport: () => void
}

export function MissingPartsToolbar({
  listTab,
  onListTabChange,
  activeCount,
  historyCount,
  filters,
  onFiltersChange,
  stationOptions,
  modelOptions,
  departmentFilterCodes,
  departments,
  filteredVehicleCount,
  tabVehicleCount,
  hasActiveFilter,
  canReport,
  role,
  onRefresh,
  onReport
}: Props) {
  const { t, lang } = useLang()

  return (
    <div className="border-b border-slate-800 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/15 p-3 text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{t('mp.title')}</h2>
            <p className="text-sm text-slate-400">{t('mp.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="inline h-4 w-4" />
          </button>
          {listTab === 'active' && (
            <button
              type="button"
              onClick={() => canReport && onReport()}
              disabled={!canReport}
              title={!canReport ? t('mp.noReportPermHint', { role }) : t('mp.report')}
              className={`rounded-xl p-2.5 sm:flex-none ${
                canReport ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'cursor-not-allowed bg-slate-700 text-slate-500'
              }`}
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onListTabChange('active')}
          className={`rounded-xl px-4 py-2 text-sm font-black ${
            listTab === 'active' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {t('mp.tabs.active')} ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => onListTabChange('history')}
          className={`rounded-xl px-4 py-2 text-sm font-black ${
            listTab === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Archive className="mr-1 inline h-4 w-4" />
          {t('mp.tabs.history')} ({historyCount})
        </button>
      </div>

      {listTab === 'active' && !canReport && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t('mp.noReportPermHint', { role })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="input-dark"
          placeholder={t('mp.searchPlaceholder')}
          value={filters.search}
          onChange={e => onFiltersChange({ search: e.target.value })}
        />
        <select className="input-dark" value={filters.stationNumber} onChange={e => onFiltersChange({ stationNumber: e.target.value })}>
          <option value="">{t('mp.filterStation')}</option>
          {stationOptions.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="input-dark" value={filters.modelName} onChange={e => onFiltersChange({ modelName: e.target.value })}>
          <option value="">{t('mp.filterModel')}</option>
          {modelOptions.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="input-dark" value={filters.department} onChange={e => onFiltersChange({ department: e.target.value })}>
          <option value="">{t('mp.filterDepartment')}</option>
          {departmentFilterCodes.map(code => (
            <option key={code} value={code}>
              {mpLookupLabel(departments, code, lang)}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-sm font-bold text-cyan-300">
        {hasActiveFilter
          ? t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })
          : t('mp.filterVehicleCount', { n: filteredVehicleCount })}
      </p>
      {listTab === 'active' && <p className="mt-2 text-xs text-slate-500">{t('mp.completeSeparateHint')}</p>}
    </div>
  )
}
