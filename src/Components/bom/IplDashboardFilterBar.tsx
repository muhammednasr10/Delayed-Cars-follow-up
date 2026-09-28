import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { IplCompareSearchInput } from './IplCompareSearchInput'
import { IplModelTabsBar } from './IplModelTabsBar'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import type { Station, VehicleModel } from '../../Types/settings'
import type { IplDiffFilter, IplFitClassFilter, IplSearchSuggestion } from '../../Utils/iplCompareFilters'

type Props = {
  models: VehicleModel[]
  assignableModels: VehicleModel[]
  openTabs: string[]
  onToggleModel: (name: string) => void
  onToggleFamily: (names: string[]) => void
  stations: Station[]
  stationId: string
  onStationId: (id: string) => void
  fitFilter: IplFitClassFilter
  onFitFilter: (value: IplFitClassFilter) => void
  diffFilter: IplDiffFilter
  onDiffFilter: (value: IplDiffFilter) => void
  search: string
  onSearch: (value: string) => void
  suggestions: IplSearchSuggestion[]
}

export function IplDashboardFilterBar({
  models,
  assignableModels,
  openTabs,
  onToggleModel,
  onToggleFamily,
  stations,
  stationId,
  onStationId,
  fitFilter,
  onFitFilter,
  diffFilter,
  onDiffFilter,
  search,
  onSearch,
  suggestions
}: Props) {
  const { t } = useLang()

  return (
    <div className="card-industrial p-4">
      <IplCompareSearchInput value={search} suggestions={suggestions} onChange={onSearch} />
      <div className="mt-3 border-t border-slate-800/80 pt-3">
        <IplModelTabsBar
          models={assignableModels}
          allModels={models}
          openTabs={openTabs}
          onToggleModel={onToggleModel}
          onToggleFamily={onToggleFamily}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.filterStation')}</span>
            <select className={inputCls()} value={stationId} onChange={e => onStationId(e.target.value)}>
              <option value="">{t('bom.allStations')}</option>
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {formatStationReferenceCode(station.station_number)} — {station.station_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-emerald-300">{t('bom.iplFilterFit')}</span>
            <select
              className={inputCls()}
              value={fitFilter}
              onChange={e => onFitFilter(e.target.value as IplFitClassFilter)}
            >
              <option value="">{t('common.all')}</option>
              <option value="all_fitted">{t('bom.iplFilterFitAllYes')}</option>
              <option value="all_not_fitted">{t('bom.iplFilterFitAllNo')}</option>
              <option value="all_unset">{t('bom.iplFilterFitAllUnset')}</option>
              <option value="mixed">{t('bom.iplFilterFitMixed')}</option>
              <option value="has_unset">{t('bom.iplFilterFitHasUnset')}</option>
              <option value="has_not_fitted">{t('bom.iplFilterFitHasNo')}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-amber-300">{t('bom.iplFilterDiff')}</span>
            <select
              className={inputCls()}
              value={diffFilter}
              onChange={e => onDiffFilter(e.target.value as IplDiffFilter)}
            >
              <option value="">{t('common.all')}</option>
              <option value="any">{t('bom.iplFilterDiffAny')}</option>
              <option value="part_number">{t('bom.iplComparePartNumberDifferent')}</option>
              <option value="station">{t('bom.iplCompareStationDifferent')}</option>
              <option value="qty">{t('bom.iplCompareQtyDifferent')}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
