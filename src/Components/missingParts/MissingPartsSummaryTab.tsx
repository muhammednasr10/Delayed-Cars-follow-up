import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { buildMissingPartSummary } from '../../Utils/missingPartSummary'
import {
  dimensionDepartment,
  dimensionPartDescription,
  dimensionReasonClass,
  dimensionReporter,
  dimensionStation
} from '../../Utils/missingPartDimensionModelQtyMatrix'
import { MissingPartsModelReasonMatrix } from './MissingPartsModelReasonMatrix'
import { MissingPartsDimensionModelQtyMatrix } from './MissingPartsDimensionModelQtyMatrix'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  hasActiveFilter: boolean
  filteredVehicleCount: number
  tabVehicleCount: number
  variant?: 'active' | 'archive'
}

function OverviewTable({
  stats,
  isArchive
}: {
  stats: ReturnType<typeof buildMissingPartSummary>
  isArchive: boolean
}) {
  const { t } = useLang()
  const rows: { label: string; value: number; tone?: string }[] = [
    { label: t('mp.summary.vehicles'), value: stats.vehicleCount, tone: 'text-cyan-200' },
    { label: t('mp.summary.lines'), value: stats.lineCount, tone: 'text-white' },
    { label: t('mp.summary.remainingQty'), value: stats.remainingQty, tone: 'text-amber-200' }
  ]
  if (!isArchive) {
    rows.push(
      { label: t('mp.summary.pendingVehicles'), value: stats.pendingInstallVehicles, tone: 'text-amber-100' },
      { label: t('mp.summary.pendingLines'), value: stats.pendingInstallLines, tone: 'text-rose-200' },
      { label: t('mp.summary.readyArchive'), value: stats.fullyInstalledVehicles, tone: 'text-emerald-200' }
    )
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h4 className="text-sm font-black text-slate-200">{t('mp.summary.overview')}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              {rows.map(r => (
                <th key={r.label} className="table-cell whitespace-nowrap px-3 py-2.5 font-black text-slate-400">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-900/30">
              {rows.map(r => (
                <td key={r.label} className={`table-cell px-3 py-3 text-xl font-black tabular-nums ${r.tone ?? ''}`}>
                  {r.value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MissingPartsSummaryTab({
  items,
  reasons,
  departments,
  hasActiveFilter,
  filteredVehicleCount,
  tabVehicleCount,
  variant = 'active'
}: Props) {
  const { t, lang } = useLang()
  const stats = useMemo(() => buildMissingPartSummary(items, variant), [items, variant])
  const isArchive = variant === 'archive'
  const qtyHint = t('mp.summary.dimByModelHint')

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-black text-cyan-200">
          {t(isArchive ? 'mp.summary.archiveTitle' : 'mp.summary.title')}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          {t(isArchive ? 'mp.summary.archiveHintDetailed' : 'mp.summary.hintDetailed')}
        </p>
        <p className="mt-2 text-sm font-bold text-cyan-300">
          {hasActiveFilter
            ? t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })
            : t('mp.filterVehicleCount', { n: filteredVehicleCount })}
        </p>
      </div>

      {/* 1) Totals */}
      <OverviewTable stats={stats} isArchive={isArchive} />

      {/* 2) Model × reason class (vehicles) — active only */}
      {!isArchive && <MissingPartsModelReasonMatrix items={items} reasons={reasons} variant="active" />}

      {/* Remaining tables: required qty by model columns + total */}
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
        items={items}
        variant={variant}
        title={t('mp.summary.byDepartment')}
        hint={qtyHint}
        rowHeader={t('mp.cols.department')}
        getDimension={dimensionDepartment}
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
  )
}
