import { Plus, RefreshCcw, Search, X } from 'lucide-react'
import { inputCls } from '../FormField'
import { IplModelTabsBar } from './IplModelTabsBar'
import { IplCompareSearchInput } from './IplCompareSearchInput'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import { isSelectableVehicleModel } from '../../Utils/vehicleModelHierarchy'
import type { BomByModelDataReturn } from '../../hooks/useBomByModelData'
import type { IplDiffFilter, IplFitClassFilter } from '../../Utils/iplCompareFilters'

export function BomByModelFilterBar({ data }: { data: BomByModelDataReturn }) {
  const {
    t, perModel, search, setSearch, setPage, activeExcelFilterCount,
    clearAllExcelFilters, reload, canCreate, canUpdate, openPartCreate,
    setFormMode, setEditId, setEditIds, assignableModels, models,
    openTabsActive, toggleModelTab, toggleFamilyTabs, stationId,
    setStationId, masterStations, modelName, setModelName, modelPicker,
    stopperType, setStopperType, noOperationOnly, setNoOperationOnly,
    compareMode, effectiveModelName, selectedName, filteredCount, total,
    groupTotal, lineScope, compareFitSummary, fitModelTotal,
    iplFitFilter, setIplFitFilter, iplDiffFilter, setIplDiffFilter,
    iplSearchSuggestions
  } = data

  return (
    <div className="card-industrial p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {perModel && compareMode ? (
          <IplCompareSearchInput
            value={search}
            suggestions={iplSearchSuggestions}
            onChange={value => {
              setSearch(value)
              setPage(1)
            }}
          />
        ) : (
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t('bom.search')}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputCls()} w-full ps-9`}
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('bom.searchPh')}
            />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          {activeExcelFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllExcelFilters}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
            >
              <X className="inline h-3 w-3" /> {t('bom.excel.clearAllFilters', { n: activeExcelFilterCount })}
            </button>
          )}
          <button
            type="button"
            onClick={() => reload()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="inline h-4 w-4" /> {t('common.refresh')}
          </button>
          {(perModel ? canCreate || canUpdate : canCreate) && (
            <button
              type="button"
              onClick={() => {
                if (perModel) {
                  openPartCreate()
                  return
                }
                setFormMode('create')
                setEditId(null)
                setEditIds([])
              }}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            >
              <Plus className="inline h-4 w-4" /> {perModel ? t('bom.partListAdd') : t('bom.addRow')}
            </button>
          )}
        </div>
      </div>

      {perModel ? (
        <div className="mt-3 border-t border-slate-800/80 pt-3">
          <IplModelTabsBar
            models={assignableModels}
            allModels={models}
            openTabs={openTabsActive}
            onToggleModel={toggleModelTab}
            onToggleFamily={toggleFamilyTabs}
          />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.filterStation')}</span>
              <select
                className={inputCls()}
                value={stationId}
                onChange={e => {
                  setStationId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('bom.allStations')}</option>
                {masterStations.map(s => (
                  <option key={s.id} value={s.id}>
                    {formatStationReferenceCode(s.station_number)} — {s.station_name}
                  </option>
                ))}
              </select>
            </label>
            {compareMode && (
              <>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase text-emerald-300">{t('bom.iplFilterFit')}</span>
                  <select
                    className={inputCls()}
                    value={iplFitFilter}
                    onChange={e => {
                      setIplFitFilter(e.target.value as IplFitClassFilter)
                      setPage(1)
                    }}
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
                    value={iplDiffFilter}
                    onChange={e => {
                      setIplDiffFilter(e.target.value as IplDiffFilter)
                      setPage(1)
                    }}
                  >
                    <option value="">{t('common.all')}</option>
                    <option value="any">{t('bom.iplFilterDiffAny')}</option>
                    <option value="part_number">{t('bom.iplComparePartNumberDifferent')}</option>
                    <option value="station">{t('bom.iplCompareStationDifferent')}</option>
                    <option value="qty">{t('bom.iplCompareQtyDifferent')}</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-violet-300">{t('bom.filterModel')}</span>
            <select
              className={inputCls()}
              value={modelName}
              onChange={e => {
                setModelName(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('bom.allModels')}</option>
              {modelPicker.groups.map(g => (
                <optgroup key={g.family.id} label={g.family.name}>
                  {g.variants.filter(m => isSelectableVehicleModel(m, models)).map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {modelPicker.orphanVariants.filter(m => isSelectableVehicleModel(m, models)).map(m => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.filterStation')}</span>
            <select
              className={inputCls()}
              value={stationId}
              onChange={e => {
                setStationId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('bom.allStations')}</option>
              {masterStations.map(s => (
                <option key={s.id} value={s.id}>
                  {formatStationReferenceCode(s.station_number)} — {s.station_name}
                </option>
              ))}
            </select>
          </label>
          <>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                {t('bom.stopperType')}
              </span>
              <select
                className={inputCls()}
                value={stopperType}
                onChange={e => {
                  setStopperType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('common.all')}</option>
                <option value="line_stopper">{t('bom.stopperLine')}</option>
                <option value="car_stopper">{t('bom.stopperCar')}</option>
                <option value="non_stopper">{t('bom.stopperNone')}</option>
              </select>
            </label>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={noOperationOnly}
                  onChange={e => {
                    setNoOperationOnly(e.target.checked)
                    setPage(1)
                  }}
                />
                {t('bom.noOperationOnly')}
              </label>
            </div>
          </>
        </div>
      )}

      {perModel && compareMode && compareFitSummary && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {t('bom.iplFitTotalsTitle', { models: fitModelTotal, parts: compareFitSummary.total })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-200">
              {t('bom.iplFitTotalsYes', { n: compareFitSummary.allFitted })}
            </span>
            <span className="inline-flex items-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-black text-rose-200">
              {t('bom.iplFitTotalsNo', { n: compareFitSummary.allNotFitted })}
            </span>
            <span className="inline-flex items-center rounded-lg border border-slate-600/50 bg-slate-800/80 px-2.5 py-1 text-xs font-black text-slate-300">
              {t('bom.iplFitTotalsUnset', { n: compareFitSummary.allUnset })}
            </span>
            <span className="inline-flex items-center rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-200">
              {t('bom.iplFitTotalsMixed', { n: compareFitSummary.mixed })}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {t('bom.iplFitTotalsSlots', {
              yes: compareFitSummary.modelSlotsFitted,
              no: compareFitSummary.modelSlotsNotFitted,
              unset: compareFitSummary.modelSlotsUnset
            })}
          </p>
        </div>
      )}

      <p className="mt-3 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
        {perModel && compareMode
          ? t('bom.iplModelCompareSummary', { models: openTabsActive.length, parts: filteredCount ?? 0 })
          : perModel && effectiveModelName
            ? t('bom.modelBomSummary', { model: selectedName, n: filteredCount ?? 0, shown: groupTotal })
            : !perModel && modelName
              ? t('bom.modelBomSummary', { model: selectedName, n: filteredCount ?? 0, shown: groupTotal })
              : (lineScope as string) === 'gd'
                ? t('bom.gdBomSummary', { n: filteredCount ?? total, shown: groupTotal })
                : t('bom.allBomSummary', { n: filteredCount ?? total, shown: groupTotal })}
        {activeExcelFilterCount > 0 && (
          <span className="ms-2 text-cyan-400">· {t('bom.excel.filtersActive', { n: activeExcelFilterCount })}</span>
        )}
      </p>
    </div>
  )
}
