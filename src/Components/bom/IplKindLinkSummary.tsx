import type { ReactNode } from 'react'
import { Boxes, Layers, Package, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  IPL_KIND_LABEL_KEY,
  iplKindPct,
  iplKindTone,
  iplKindTotals,
  iplKindUnlinked,
  type IplKindKey,
  type IplKindLinkRow
} from '../../Utils/iplKindLinks'
import { StatCard } from '../StatCard'
import { IplDashboardSummaryTable } from './IplDashboardSummaryTable'

const KIND_ICONS: Record<IplKindKey, ReactNode> = {
  part: <Package className="h-5 w-5" />,
  hardware: <Wrench className="h-5 w-5" />,
  plastics: <Boxes className="h-5 w-5" />,
  chemicals: <Layers className="h-5 w-5" />
}

function kindBarClass(tone: ReturnType<typeof iplKindTone>): string {
  if (tone === 'green') return 'border-emerald-500/30 bg-emerald-500/10'
  if (tone === 'orange') return 'border-amber-500/30 bg-amber-500/10'
  return 'border-slate-800 bg-slate-950/60'
}

type Props = {
  rows: IplKindLinkRow[]
  layout?: 'bar' | 'section'
}

export function IplKindLinkSummary({ rows, layout = 'bar' }: Props) {
  const { t } = useLang()
  const totals = iplKindTotals(rows)
  const heading = `${t('bom.iplDashKindTable')} · ${t('bom.iplDashKindLinkedSub', {
    linked: totals.linked,
    total: totals.total
  })}`

  if (layout === 'section') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {rows.map(row => (
            <StatCard
              key={row.kind}
              title={t(IPL_KIND_LABEL_KEY[row.kind])}
              value={String(row.total)}
              subtitle={t('bom.iplDashKindLinkedSub', { linked: row.linked, total: row.total })}
              icon={KIND_ICONS[row.kind]}
              tone={iplKindTone(row)}
            />
          ))}
        </div>
        <IplDashboardSummaryTable
          title={t('bom.iplDashKindTable')}
          note={t('bom.iplDashKindLinkedSub', { linked: totals.linked, total: totals.total })}
          headers={[
            t('bom.col.part_kind'),
            t('bom.iplDashPartCount'),
            t('bom.iplDashKindLinked'),
            t('bom.iplDashKindUnlinked'),
            t('bom.iplDashKindPct')
          ]}
        >
          {rows.map(row => (
            <tr key={row.kind} className="border-b border-slate-800/60">
              <td className="px-3 py-2 font-bold text-white">{t(IPL_KIND_LABEL_KEY[row.kind])}</td>
              <td className="px-3 py-2 font-black text-white">{row.total}</td>
              <td className="px-3 py-2 text-emerald-300">{row.linked}</td>
              <td className="px-3 py-2 text-slate-400">{iplKindUnlinked(row)}</td>
              <td className="px-3 py-2 text-cyan-300">{iplKindPct(row)}</td>
            </tr>
          ))}
        </IplDashboardSummaryTable>
      </div>
    )
  }

  return (
    <div className="space-y-2 border-b border-slate-800 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{heading}</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {rows.map(row => (
          <div key={row.kind} className={`rounded-xl border px-3 py-2 ${kindBarClass(iplKindTone(row))}`}>
            <div className="flex items-center gap-2 text-slate-300">
              {KIND_ICONS[row.kind]}
              <span className="text-xs font-black">{t(IPL_KIND_LABEL_KEY[row.kind])}</span>
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-white">{row.total}</p>
            <p className="text-[11px] font-bold text-cyan-200">
              {t('bom.iplDashKindLinked')}: {row.linked}
              <span className="ms-1 text-slate-500">/ {row.total}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
