import { useMemo, useState } from 'react'
import { BarChart3, LayoutGrid } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { buildMissingPartSummary, sliceTopSummaryRows } from '../../Utils/missingPartSummary'
import {
  dimensionCausingDepartment,
  dimensionCompletingDepartment,
  dimensionPartDescription,
  dimensionReasonClass,
  dimensionReporter,
  dimensionStation
} from '../../Utils/missingPartDimensionModelQtyMatrix'
import { MissingPartsModelReasonMatrix } from './MissingPartsModelReasonMatrix'
import { MissingPartsDimensionModelQtyMatrix } from './MissingPartsDimensionModelQtyMatrix'
import {
  DepartmentLevelFilter,
  SummaryRankTable,
  SummaryStatPill,
  rollupDepartmentCode,
  type DepartmentRollupLevel
} from './MissingPartsSummaryBits'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  orgUnits: FactoryOrgUnit[]
  hasActiveFilter: boolean
  filteredVehicleCount: number
  tabVehicleCount: number
  variant?: 'active' | 'archive'
}

type SummaryView = 'quick' | 'detail'

const TOP_N = 8

export function MissingPartsSummaryTab({
  items,
  reasons,
  departments,
  orgUnits,
  hasActiveFilter,
  filteredVehicleCount,
  tabVehicleCount,
  variant = 'active'
}: Props) {
  const { t, lang } = useLang()
  const [view, setView] = useState<SummaryView>('quick')
  const [departmentLevel, setDepartmentLevel] = useState<DepartmentRollupLevel>('raw')
  const stats = useMemo(() => buildMissingPartSummary(items, variant), [items, variant])
  const isArchive = variant === 'archive'
  const qtyHint = t('mp.summary.dimByModelHint')
  const showPending = !isArchive

  const departmentScopedItems = useMemo(
    () =>
      items.map(item => ({
        ...item,
        department: rollupDepartmentCode(item.department, departmentLevel, orgUnits) ?? item.department,
        completingDepartment: rollupDepartmentCode(item.completingDepartment, departmentLevel, orgUnits)
      })),
    [items, departmentLevel, orgUnits]
  )
  const departmentStats = useMemo(
    () => buildMissingPartSummary(departmentScopedItems, variant),
    [departmentScopedItems, variant]
  )

  const labelForCode = (code: string | undefined, lookup: MpLookupOption[]) =>
    code ? mpLookupLabel(lookup, code, lang) : '—'

  const top = useMemo(
    () => ({
      models: sliceTopSummaryRows(stats.byModel, TOP_N),
      reasons: sliceTopSummaryRows(stats.byReason, TOP_N),
      parts: sliceTopSummaryRows(stats.byPart, TOP_N),
      causing: sliceTopSummaryRows(departmentStats.byCausingDepartment, TOP_N),
      completing: sliceTopSummaryRows(departmentStats.byCompletingDepartment, TOP_N),
      reporters: sliceTopSummaryRows(stats.byReporter, TOP_N),
      stations: sliceTopSummaryRows(
        stats.byStation.filter(s => s.key !== '—'),
        TOP_N
      )
    }),
    [departmentStats, stats]
  )

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-cyan-200">
              {t(isArchive ? 'mp.summary.archiveTitle' : 'mp.summary.title')}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {t(isArchive ? 'mp.summary.archiveHintDetailed' : 'mp.summary.hintRedesigned')}
            </p>
            {hasActiveFilter && (
              <p className="mt-2 text-xs font-bold text-amber-300">{t('mp.summary.filteredNote')}</p>
            )}
            <p className="mt-1 text-sm font-bold text-cyan-300">
              {hasActiveFilter
                ? t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })
                : t('mp.filterVehicleCount', { n: filteredVehicleCount })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t('mp.summary.topNote', { n: TOP_N })}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView('quick')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black ${
                view === 'quick' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              {t('mp.summary.quickTab')}
            </button>
            <button
              type="button"
              onClick={() => setView('detail')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black ${
                view === 'detail' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              {t('mp.summary.detailTab')}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isArchive ? 'xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-6'}`}
      >
        <SummaryStatPill label={t('mp.summary.vehicles')} value={stats.vehicleCount} />
        <SummaryStatPill label={t('mp.summary.lines')} value={stats.lineCount} tone="slate" />
        <SummaryStatPill label={t('mp.summary.remainingQty')} value={stats.remainingQty} tone="amber" />
        {!isArchive && (
          <>
            <SummaryStatPill label={t('mp.summary.pendingVehicles')} value={stats.pendingInstallVehicles} tone="rose" />
            <SummaryStatPill label={t('mp.summary.pendingLines')} value={stats.pendingInstallLines} tone="rose" />
            <SummaryStatPill label={t('mp.summary.readyArchive')} value={stats.fullyInstalledVehicles} tone="emerald" />
          </>
        )}
      </div>

      {view === 'quick' ? (
        <>
          {!isArchive && <MissingPartsModelReasonMatrix items={items} reasons={reasons} variant="active" />}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SummaryRankTable
              title={t('mp.summary.topModels')}
              rows={top.models}
              labelHeader={t('mp.cols.model')}
              renderLabel={row => row.label ?? row.key}
              showPending={showPending}
            />
            <SummaryRankTable
              title={t('mp.summary.topReasons')}
              rows={top.reasons}
              labelHeader={t('mp.cols.reasonClass')}
              renderLabel={row => labelForCode(row.code ?? row.key, reasons)}
              showPending={showPending}
            />
            <SummaryRankTable
              title={t('mp.summary.topParts')}
              rows={top.parts}
              labelHeader={t('mp.cols.reason')}
              renderLabel={row => row.label ?? row.key}
              showPending={showPending}
            />
            <div className="xl:col-span-2">
              <DepartmentLevelFilter level={departmentLevel} onChange={setDepartmentLevel} />
            </div>
            <SummaryRankTable
              title={t('mp.summary.topCausingDepartments')}
              rows={top.causing}
              labelHeader={t('mp.cols.causingDepartment')}
              renderLabel={row => labelForCode(row.code ?? row.key, departments)}
              showPending={showPending}
            />
            <SummaryRankTable
              title={t('mp.summary.topCompletingDepartments')}
              rows={top.completing}
              labelHeader={t('mp.cols.completingDepartment')}
              renderLabel={row => labelForCode(row.code ?? row.key, departments)}
              showPending={showPending}
            />
            <SummaryRankTable
              title={t('mp.summary.topReporters')}
              rows={top.reporters}
              labelHeader={t('mp.cols.createdBy')}
              renderLabel={row => row.label ?? row.key}
              showPending={showPending}
            />
            {top.stations.length > 0 && (
              <SummaryRankTable
                title={t('mp.summary.topStations')}
                rows={top.stations}
                labelHeader={t('mp.cols.station')}
                renderLabel={row => row.label ?? row.key}
                showPending={showPending}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{qtyHint}</p>
          {!isArchive && <MissingPartsModelReasonMatrix items={items} reasons={reasons} variant="active" />}

          <MissingPartsDimensionModelQtyMatrix
            items={items}
            variant={variant}
            title={t('mp.summary.byReason')}
            hint={qtyHint}
            rowHeader={t('mp.cols.reasonClass')}
            getDimension={dimensionReasonClass}
            renderDimensionLabel={code => mpLookupLabel(reasons, code, lang)}
          />

          <MissingPartsDimensionModelQtyMatrix
            items={items}
            variant={variant}
            title={t('mp.summary.byPart')}
            hint={qtyHint}
            rowHeader={t('mp.cols.reason')}
            getDimension={dimensionPartDescription}
          />

          <MissingPartsDimensionModelQtyMatrix
            items={departmentScopedItems}
            variant={variant}
            title={t('mp.summary.byCausingDepartment')}
            hint={qtyHint}
            rowHeader={t('mp.cols.causingDepartment')}
            getDimension={dimensionCausingDepartment}
            renderDimensionLabel={code => mpLookupLabel(departments, code, lang)}
          />

          <DepartmentLevelFilter level={departmentLevel} onChange={setDepartmentLevel} />

          <MissingPartsDimensionModelQtyMatrix
            items={departmentScopedItems}
            variant={variant}
            title={t('mp.summary.byCompletingDepartment')}
            hint={qtyHint}
            rowHeader={t('mp.cols.completingDepartment')}
            getDimension={dimensionCompletingDepartment}
            renderDimensionLabel={code => mpLookupLabel(departments, code, lang)}
          />

          <MissingPartsDimensionModelQtyMatrix
            items={items}
            variant={variant}
            title={t('mp.summary.byReporter')}
            hint={qtyHint}
            rowHeader={t('mp.cols.createdBy')}
            getDimension={dimensionReporter}
          />

          <MissingPartsDimensionModelQtyMatrix
            items={items}
            variant={variant}
            title={t('mp.summary.byStation')}
            hint={qtyHint}
            rowHeader={t('mp.cols.station')}
            getDimension={dimensionStation}
            hideEmptyDash
          />
        </div>
      )}
    </div>
  )
}
