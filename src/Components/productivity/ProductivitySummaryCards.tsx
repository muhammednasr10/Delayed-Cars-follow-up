import type { ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { ModelProductivityBreakdownRow } from '../../Utils/productivityBreakdown'
import { SummaryPill } from '../production/PlanStatCards'
import { ProductivityBreakdownHover } from './ProductivityBreakdownHover'

type Props = {
  availableDays: number
  actualDays: number
  plannedHours: number
  actualHours: number
  stopLostVehicles: number
  stopMinutes: number
  entryProductivity: number
  exitProductivity: number
  assemblyDeficit: number
  repairProductivity: number
  monthBreakdown: ModelProductivityBreakdownRow[]
}

function formatCount(n: number): string {
  return n ? String(n) : '—'
}

function productivityValue(
  quantity: number,
  breakdown: ModelProductivityBreakdownRow[],
  kind: 'entry' | 'exit' | 'repair',
  valueClass: string
): ReactNode {
  if (!quantity) return '—'
  return (
    <ProductivityBreakdownHover breakdown={breakdown} kind={kind} className={valueClass}>
      {formatCount(quantity)}
    </ProductivityBreakdownHover>
  )
}

function CardPair({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}

export function ProductivitySummaryCards({
  availableDays,
  actualDays,
  plannedHours,
  actualHours,
  stopLostVehicles,
  stopMinutes,
  entryProductivity,
  exitProductivity,
  assemblyDeficit,
  repairProductivity,
  monthBreakdown
}: Props) {
  const { t } = useLang()

  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <CardPair>
        <SummaryPill label={t('productionOrders.workDays.available')} value={String(availableDays)} tone="violet" />
        <SummaryPill label={t('productionOrders.workDaysTab.summary.actualDays')} value={String(actualDays)} tone="violet" />
      </CardPair>
      <CardPair>
        <SummaryPill
          label={t('productionOrders.workDaysTab.summary.plannedHours')}
          value={plannedHours ? String(plannedHours) : '—'}
          tone="cyan"
        />
        <SummaryPill
          label={t('productionOrders.workDaysTab.summary.actualHours')}
          value={actualHours ? String(actualHours) : '—'}
          tone="slate"
        />
      </CardPair>
      <CardPair>
        <SummaryPill
          label={t('productionOrders.workDaysTab.summary.totalStopsCars')}
          value={formatCount(stopLostVehicles)}
          tone="amber"
        />
        <SummaryPill
          label={t('productionOrders.workDaysTab.summary.totalStops')}
          value={formatCount(stopMinutes)}
          tone="amber"
        />
      </CardPair>
      <CardPair>
        <SummaryPill
          label={t('productionOrders.workDaysTab.cols.entryProductivity')}
          value={productivityValue(entryProductivity, monthBreakdown, 'entry', 'text-cyan-300')}
          tone="cyan"
        />
        <SummaryPill
          label={t('productionOrders.workDaysTab.summary.assemblyDeficit')}
          value={formatCount(assemblyDeficit)}
          tone="rose"
        />
      </CardPair>
      <CardPair>
        <SummaryPill
          label={t('productionOrders.workDaysTab.cols.exitProductivity')}
          value={productivityValue(exitProductivity, monthBreakdown, 'exit', 'text-emerald-300')}
          tone="emerald"
        />
        <SummaryPill
          label={t('productionOrders.workDaysTab.cols.repairProductivity')}
          value={productivityValue(repairProductivity, monthBreakdown, 'repair', 'text-orange-300')}
          tone="orange"
        />
      </CardPair>
    </div>
  )
}
