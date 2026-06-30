import { AlertTriangle, Archive, BarChart3, PlusCircle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { MissingPartDetail, MissingPartFilters } from '../../Types/missingPart'
import { MissingPartSearchAutocomplete } from './MissingPartSearchAutocomplete'

export type ListTab = 'active' | 'summary' | 'history' | 'historySummary'

type Props = {
  listTab: ListTab
  visibleTabs: ListTab[]
  canUseFilters: boolean
  onListTabChange: (tab: ListTab) => void
  activeCount: number
  historyCount: number
  searchPool: MissingPartDetail[]
  filters: MissingPartFilters
  onFiltersChange: (patch: Partial<MissingPartFilters>) => void
  stationOptions: string[]
  modelOptions: string[]
  departmentFilterCodes: string[]
  departments: MpLookupOption[]
  canReport: boolean
  role: string
  onReport: () => void
}

export function MissingPartsToolbar({
  listTab,
  visibleTabs,
  canUseFilters,
  onListTabChange,
  activeCount,
  historyCount,
  searchPool,
  filters,
  onFiltersChange,
  stationOptions,
  modelOptions,
  departmentFilterCodes,
  departments,
  canReport,
  role,
  onReport
}: Props) {
  const { t, lang } = useLang()

  const tabButtons: { key: ListTab; className: (active: boolean) => string; icon?: typeof Archive }[] = [
    {
      key: 'active',
      className: active => (active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')
    },
    {
      key: 'summary',
      className: active => (active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: BarChart3
    },
    {
      key: 'history',
      className: active => (active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: Archive
    },
    {
      key: 'historySummary',
      className: active => (active ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'),
      icon: BarChart3
    }
  ]

  return (
    <div className="border-b border-slate-800 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-500/15 p-3 text-red-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{t('mp.title')}</h2>
          </div>
        </div>
        {listTab === 'active' && (
          <button
            type="button"
            onClick={() => canReport && onReport()}
            disabled={!canReport}
            title={!canReport ? t('mp.noReportPermHint', { role }) : t('mp.report')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black sm:px-5 ${
              canReport ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : 'cursor-not-allowed bg-slate-700 text-slate-500'
            }`}
          >
            <PlusCircle className="h-6 w-6 shrink-0" />
            <span>{t('mp.report')}</span>
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabButtons
          .filter(item => visibleTabs.includes(item.key))
          .map(item => {
            const active = listTab === item.key
            const Icon = item.icon
            const count =
              item.key === 'active' ? activeCount : item.key === 'history' ? historyCount : null
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onListTabChange(item.key)}
                className={`rounded-xl px-4 py-2 text-sm font-black ${item.className(active)}`}
              >
                {Icon && <Icon className="mr-1 inline h-4 w-4" />}
                {t(`mp.tabs.${item.key}`)}
                {count !== null ? ` (${count})` : ''}
              </button>
            )
          })}
      </div>

      {listTab === 'active' && !canReport && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t('mp.noReportPermHint', { role })}
        </div>
      )}

      {canUseFilters && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MissingPartSearchAutocomplete
            items={searchPool}
            value={filters.search}
            onChange={search => onFiltersChange({ search })}
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
      )}
    </div>
  )
}
