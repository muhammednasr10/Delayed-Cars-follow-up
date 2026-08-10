import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { ProductivityDailyStopsSummary } from './ProductivityDailyStopsSummary'
import {
  DAILY_PRODUCTIVITY_TARGET,
  computeProductivityLossRemainder,
  computeProductivityLostCars
} from '../../Utils/productionPlanWorkDayDaily'
import type { ProductivityDelayKind } from '../../Types/productivityDelayReason'
import type { ProductionLineStop } from '../../Types/productionStop'

type Props = {
  open: boolean
  workDate: string
  kind: ProductivityDelayKind
  productivity: number
  stopLostVehicles: number
  stops: ProductionLineStop[]
  reasons: string
  onClose: () => void
}

type TabKey = 'stops' | 'remainder'

function kindLabel(t: (key: string) => string, kind: ProductivityDelayKind): string {
  if (kind === 'entry') return t('productionOrders.workDaysTab.cols.entryProductivity')
  if (kind === 'exit') return t('productionOrders.workDaysTab.cols.exitProductivity')
  return t('productionOrders.workDaysTab.cols.repairProductivity')
}

function BreakdownStat({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'rose' | 'amber' | 'violet' }) {
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'rose'
        ? 'text-rose-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'violet'
            ? 'text-violet-300'
            : 'text-white'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums leading-none ${valueCls}`}>{value}</p>
    </div>
  )
}

export function ProductivityLossReasonsModal({
  open,
  workDate,
  kind,
  productivity,
  stopLostVehicles,
  stops,
  reasons,
  onClose
}: Props) {
  const { t } = useLang()
  const [tab, setTab] = useState<TabKey>('stops')
  const trimmed = reasons.trim()
  const totalLost = computeProductivityLostCars(productivity)
  const remainder = computeProductivityLossRemainder(productivity, stopLostVehicles)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stops', label: t('productivity.lossReasonsTabStops') },
    { key: 'remainder', label: t('productivity.lossReasonsTabRemainder', { target: DAILY_PRODUCTIVITY_TARGET }) }
  ]

  return (
    <Modal
      open={open}
      title={t('productivity.lossReasonsTitle')}
      subtitle={`${kindLabel(t, kind)} · ${workDate}`}
      icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <BreakdownStat label={t('productivity.lossReasonsTarget')} value={String(DAILY_PRODUCTIVITY_TARGET)} tone="violet" />
          <BreakdownStat label={t('productivity.lossReasonsAchieved')} value={productivity > 0 ? String(productivity) : '—'} tone="cyan" />
          <BreakdownStat
            label={t('productivity.lossReasonsTotalLost')}
            value={productivity > 0 ? String(totalLost) : '—'}
            tone="rose"
          />
          <BreakdownStat label={t('productivity.lossReasonsFromStops')} value={String(stopLostVehicles)} tone="amber" />
          <BreakdownStat
            label={t('productivity.lossReasonsRemainder')}
            value={productivity > 0 ? String(remainder) : '—'}
            tone={remainder > 0 ? 'rose' : 'slate'}
          />
        </div>

        <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
          {tabs.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-black transition ${
                tab === item.key ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'stops' ? (
          <ProductivityDailyStopsSummary workDate={workDate} stops={stops} />
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-200">{t('productivity.lossReasonsRemainderSection')}</h3>
              <p className="text-xs text-slate-500">
                {t('productivity.lossReasonsRemainderHint', {
                  target: DAILY_PRODUCTIVITY_TARGET,
                  lost: totalLost,
                  stops: stopLostVehicles,
                  remainder
                })}
              </p>
            </div>
            {trimmed ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{trimmed}</p>
            ) : (
              <p className="text-sm text-slate-500">{t('productivity.lossReasonsEmpty')}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
