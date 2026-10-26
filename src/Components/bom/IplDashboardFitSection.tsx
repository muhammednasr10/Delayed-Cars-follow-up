import { AlertTriangle, Boxes, Layers, Package } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { IplDashboardSummary } from '../../Utils/iplDashboardSummary'
import { StatCard } from '../StatCard'
import { IplDashboardSummaryTable } from './IplDashboardSummaryTable'

function PartNameCell({ nameAr, nameEn }: { nameAr: string; nameEn: string }) {
  return (
    <td className="px-3 py-2 text-white">
      <span className="block font-medium">{nameAr}</span>
      {nameEn && nameEn !== '—' ? (
        <span className="text-[10px] text-slate-500" dir="ltr">
          {nameEn}
        </span>
      ) : null}
    </td>
  )
}

export function IplDashboardFitSection({ ipl }: { ipl: IplDashboardSummary }) {
  const { t } = useLang()

  return (
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
        <IplDashboardSummaryTable
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
        </IplDashboardSummaryTable>

        <IplDashboardSummaryTable
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
        </IplDashboardSummaryTable>
      </div>

      <IplDashboardSummaryTable
        title={t('bom.iplDashByModelTable')}
        note={`${t('bom.iplDashPartCount')}: ${ipl.totalParts}`}
        headers={[t('bom.iplPartCardModel'), t('bom.iplFitYes'), t('bom.iplFitNo'), t('bom.iplFitUnset')]}
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
          </tr>
        ))}
      </IplDashboardSummaryTable>

      <IplDashboardSummaryTable
        title={t('bom.iplDashByStationTable')}
        headers={[t('bom.station'), t('bom.iplDashPartCount'), t('bom.iplFitYes'), t('bom.iplFitNo'), t('bom.iplFitUnset')]}
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
      </IplDashboardSummaryTable>

      <div className="grid gap-4 lg:grid-cols-2">
        <IplDashboardSummaryTable
          title={t('bom.iplDashMostUnsetTable')}
          headers={[t('bom.col.part_name_ar'), t('bom.iplFitUnset'), t('bom.iplFitYes'), t('bom.iplFitNo')]}
          empty={ipl.mostUnset.length === 0}
        >
          {ipl.mostUnset.map(row => (
            <tr key={row.key} className="border-b border-slate-800/60">
              <PartNameCell nameAr={row.nameAr} nameEn={row.nameEn} />
              <td className="px-3 py-2 font-black text-slate-300">{row.unset}</td>
              <td className="px-3 py-2 text-emerald-300">{row.fitted}</td>
              <td className="px-3 py-2 text-rose-300">{row.notFitted}</td>
            </tr>
          ))}
        </IplDashboardSummaryTable>

        <IplDashboardSummaryTable
          title={t('bom.iplDashMostNotFittedTable')}
          headers={[t('bom.col.part_name_ar'), t('bom.iplFitNo'), t('bom.iplFitYes'), t('bom.iplFitUnset')]}
          empty={ipl.mostNotFitted.length === 0}
        >
          {ipl.mostNotFitted.map(row => (
            <tr key={row.key} className="border-b border-slate-800/60">
              <PartNameCell nameAr={row.nameAr} nameEn={row.nameEn} />
              <td className="px-3 py-2 font-black text-rose-300">{row.notFitted}</td>
              <td className="px-3 py-2 text-emerald-300">{row.fitted}</td>
              <td className="px-3 py-2 text-slate-400">{row.unset}</td>
            </tr>
          ))}
        </IplDashboardSummaryTable>
      </div>
    </>
  )
}
