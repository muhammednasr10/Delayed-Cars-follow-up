import type { ReactNode } from 'react'
import { AlertTriangle, Boxes, Clock, Layers, Package, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useBomDashboard } from '../../hooks/useBomDashboard'
import { useEngineeringDashboard } from '../../hooks/useEngineeringDashboard'
import { StatCard } from '../StatCard'

function SummaryTable({
  title,
  headers,
  children,
  empty
}: {
  title: string
  headers: string[]
  children: ReactNode
  empty?: boolean
}) {
  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              {headers.map(h => (
                <th key={h} className="px-3 py-2 text-start">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-500">
                  —
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BomDashboardTab() {
  const { t } = useLang()
  const { stats, iplSummary, loading, error } = useBomDashboard()
  const eng = useEngineeringDashboard()

  if (loading) return <p className="text-slate-400">{t('common.loading')}</p>
  if (error) return <p className="text-red-300">{error}</p>
  if (!stats) return null

  const ipl = iplSummary

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <h2 className="text-lg font-black text-white">{t('bom.iplDashTitle')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('bom.iplDashHint')}</p>
        {ipl && (
          <p className="mt-2 text-xs text-slate-500">
            {t('bom.iplDashScope', { models: ipl.modelNames.length, parts: ipl.totalParts })}
          </p>
        )}
      </div>

      {ipl && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              title={t('bom.iplDashCardFullyFits')}
              value={String(ipl.fitSummary.allFitted)}
              subtitle={t('bom.iplDashFullyFitsSub')}
              icon={<Package className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              title={t('bom.iplDashCardFullyNo')}
              value={String(ipl.fitSummary.allNotFitted)}
              subtitle={t('bom.iplDashFullyNoSub')}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="red"
            />
            <StatCard
              title={t('bom.iplDashCardFullyUnset')}
              value={String(ipl.fitSummary.allUnset)}
              subtitle={t('bom.iplDashFullyUnsetSub')}
              icon={<Boxes className="h-5 w-5" />}
              tone="orange"
            />
            <StatCard
              title={t('bom.iplDashCardMixed')}
              value={String(ipl.fitSummary.mixed)}
              subtitle={t('bom.iplDashMixedSub')}
              icon={<Layers className="h-5 w-5" />}
              tone="orange"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryTable
              title={t('bom.iplDashDiffTable')}
              headers={[t('bom.iplDashDiffType'), t('bom.iplDashPartCount')]}
            >
              <tr className="border-b border-slate-800/60">
                <td className="px-3 py-2 text-slate-300">{t('bom.iplFilterDiffAny')}</td>
                <td className="px-3 py-2 font-black text-amber-300">{ipl.differences.anyDiff}</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="px-3 py-2 text-slate-300">{t('bom.iplComparePartNumberDifferent')}</td>
                <td className="px-3 py-2 font-black text-cyan-300">{ipl.differences.differentPn}</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="px-3 py-2 text-slate-300">{t('bom.iplCompareStationDifferent')}</td>
                <td className="px-3 py-2 font-black text-cyan-300">{ipl.differences.differentStation}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">{t('bom.iplCompareQtyDifferent')}</td>
                <td className="px-3 py-2 font-black text-cyan-300">{ipl.differences.differentQty}</td>
              </tr>
            </SummaryTable>

            <SummaryTable
              title={t('bom.iplDashFitSlotsTable')}
              headers={[t('bom.iplFitStatus'), t('bom.iplDashSlotCount')]}
            >
              <tr className="border-b border-slate-800/60">
                <td className="px-3 py-2 text-emerald-200">{t('bom.iplFitYes')}</td>
                <td className="px-3 py-2 font-black text-emerald-300">{ipl.fitSummary.modelSlotsFitted}</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="px-3 py-2 text-rose-200">{t('bom.iplFitNo')}</td>
                <td className="px-3 py-2 font-black text-rose-300">{ipl.fitSummary.modelSlotsNotFitted}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-300">{t('bom.iplFitUnset')}</td>
                <td className="px-3 py-2 font-black text-slate-200">{ipl.fitSummary.modelSlotsUnset}</td>
              </tr>
            </SummaryTable>
          </div>

          <SummaryTable
            title={t('bom.iplDashByModelTable')}
            headers={[
              t('bom.iplPartCardModel'),
              t('bom.iplFitYes'),
              t('bom.iplFitNo'),
              t('bom.iplFitUnset'),
              t('bom.iplDashPartCount')
            ]}
            empty={ipl.byModel.length === 0}
          >
            {ipl.byModel.map(row => (
              <tr key={row.model} className="border-b border-slate-800/60">
                <td className="px-3 py-2 font-bold text-white" dir="ltr">
                  {row.model}
                </td>
                <td className="px-3 py-2 text-emerald-300">{row.fitted}</td>
                <td className="px-3 py-2 text-rose-300">{row.notFitted}</td>
                <td className="px-3 py-2 text-slate-400">{row.unset}</td>
                <td className="px-3 py-2 text-slate-300">{row.totalParts}</td>
              </tr>
            ))}
          </SummaryTable>

          <SummaryTable
            title={t('bom.iplDashByStationTable')}
            headers={[
              t('bom.station'),
              t('bom.iplDashPartCount'),
              t('bom.iplFitYes'),
              t('bom.iplFitNo'),
              t('bom.iplFitUnset')
            ]}
            empty={ipl.byStation.length === 0}
          >
            {ipl.byStation.slice(0, 40).map(row => (
              <tr key={row.station} className="border-b border-slate-800/60">
                <td className="px-3 py-2 font-mono text-cyan-300" dir="ltr">
                  {row.station}
                </td>
                <td className="px-3 py-2 font-black text-white">{row.parts}</td>
                <td className="px-3 py-2 text-emerald-300">{row.fittedSlots}</td>
                <td className="px-3 py-2 text-rose-300">{row.notFittedSlots}</td>
                <td className="px-3 py-2 text-slate-400">{row.unsetSlots}</td>
              </tr>
            ))}
          </SummaryTable>

          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryTable
              title={t('bom.iplDashMostUnsetTable')}
              headers={[t('bom.col.part_name_ar'), t('bom.iplFitUnset'), t('bom.iplFitYes'), t('bom.iplFitNo')]}
              empty={ipl.mostUnset.length === 0}
            >
              {ipl.mostUnset.map(row => (
                <tr key={row.key} className="border-b border-slate-800/60">
                  <td className="px-3 py-2 text-white">
                    <span className="block font-medium">{row.nameAr}</span>
                    {row.nameEn && row.nameEn !== '—' ? (
                      <span className="text-[10px] text-slate-500" dir="ltr">
                        {row.nameEn}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-black text-slate-300">{row.unset}</td>
                  <td className="px-3 py-2 text-emerald-300">{row.fitted}</td>
                  <td className="px-3 py-2 text-rose-300">{row.notFitted}</td>
                </tr>
              ))}
            </SummaryTable>

            <SummaryTable
              title={t('bom.iplDashMostNotFittedTable')}
              headers={[t('bom.col.part_name_ar'), t('bom.iplFitNo'), t('bom.iplFitYes'), t('bom.iplFitUnset')]}
              empty={ipl.mostNotFitted.length === 0}
            >
              {ipl.mostNotFitted.map(row => (
                <tr key={row.key} className="border-b border-slate-800/60">
                  <td className="px-3 py-2 text-white">
                    <span className="block font-medium">{row.nameAr}</span>
                    {row.nameEn && row.nameEn !== '—' ? (
                      <span className="text-[10px] text-slate-500" dir="ltr">
                        {row.nameEn}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-black text-rose-300">{row.notFitted}</td>
                  <td className="px-3 py-2 text-emerald-300">{row.fitted}</td>
                  <td className="px-3 py-2 text-slate-400">{row.unset}</td>
                </tr>
              ))}
            </SummaryTable>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title={t('bom.dashTotalRows')}
          value={String(stats.totalBomRows)}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          title={t('bom.dashUniqueParts')}
          value={String(stats.uniquePartNumbers)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title={t('bom.dashDuplicates')}
          value={String(stats.duplicatePartNumbers)}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="orange"
        />
        <StatCard
          title={t('bom.dashUncategorized')}
          value={String(stats.uncategorizedParts)}
          icon={<Boxes className="h-5 w-5" />}
          tone="orange"
        />
        <StatCard
          title={t('bom.dashStations')}
          value={String(stats.totalStations)}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          title={t('bom.dashModels')}
          value={String(stats.totalModels)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title={t('bom.dashCategories')}
          value={String(stats.totalCategories)}
          icon={<Boxes className="h-5 w-5" />}
        />
        <StatCard
          title={t('bom.dashLastImport')}
          value={stats.lastImportAt ? new Date(stats.lastImportAt).toLocaleDateString() : '—'}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {eng.stats && !eng.loading && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Wrench className="h-4 w-4 text-cyan-300" />
            {t('engineering.dashTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              title={t('engineering.dashOps')}
              value={String(eng.stats.operations_total)}
              icon={<Wrench className="h-5 w-5" />}
            />
            <StatCard
              title={t('engineering.dashOpsNoParts')}
              value={String(eng.stats.operations_without_parts)}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="orange"
            />
            <StatCard
              title={t('engineering.dashTsApproved')}
              value={String(eng.stats.time_studies_approved)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title={t('engineering.dashOpsNoTime')}
              value={String(eng.stats.operations_without_standard_time)}
              icon={<Clock className="h-5 w-5" />}
              tone="orange"
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-industrial p-4">
          <h3 className="mb-3 text-sm font-black text-white">{t('bom.byCategory')}</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {stats.byCategory.slice(0, 8).map(c => (
              <li key={c.label} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-black text-cyan-300">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-industrial p-4">
          <h3 className="mb-3 text-sm font-black text-white">{t('bom.topRepeated')}</h3>
          <ul className="space-y-1 text-sm" dir="ltr">
            {stats.topRepeated.map(r => (
              <li key={r.part_number} className="flex justify-between text-slate-300">
                <span className="text-cyan-300">{r.part_number}</span>
                <span>{r.occurrence_count}×</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
