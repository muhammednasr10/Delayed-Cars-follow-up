import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import type { KanbanScenario } from '../../Types/kanbanFeeding'
import { formatShiftRange } from '../../Utils/workScheduleDefaults'
import { usePlanningWorkSchedule } from '../../hooks/usePlanningWorkSchedule'

type Props = {
  scenario: KanbanScenario
  onChange: <K extends keyof KanbanScenario>(key: K, value: KanbanScenario[K]) => void
}

export function FeedingScenarioFields({ scenario, onChange }: Props) {
  const { t } = useLang()
  const { jph, shiftStart, shiftEnd, shiftHours, loading } = usePlanningWorkSchedule()

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          {t('warehouses.feeding.settings.fromPlanning')}
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs text-slate-500">{t('warehouses.feeding.settings.jph')}</span>
            <p className="font-black text-violet-200">{loading ? '…' : jph}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">{t('warehouses.feeding.settings.shiftTimes')}</span>
            <p className="font-bold text-slate-200" dir="ltr">
              {formatShiftRange(shiftStart, shiftEnd)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">{t('warehouses.feeding.settings.shiftHours')}</span>
            <p className="font-bold text-slate-200">
              {shiftHours} {t('warehouses.kanban.hours')}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('warehouses.feeding.settings.fromPlanningHint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-bold text-violet-300">{t('warehouses.feeding.settings.safetyFactor')}</span>
          <input
            type="number"
            step="0.05"
            min={1}
            className={inputCls()}
            value={scenario.safetyFactor}
            onChange={e => onChange('safetyFactor', Number(e.target.value) || DEFAULT_FALLBACK.safetyFactor)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-400">{t('warehouses.feeding.settings.lotSize')}</span>
          <input
            type="number"
            min={1}
            className={inputCls()}
            value={scenario.lotSize}
            onChange={e => onChange('lotSize', Number(e.target.value) || DEFAULT_FALLBACK.lotSize)}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-bold text-slate-400">{t('warehouses.feeding.settings.leadTime')}</span>
          <input
            type="number"
            min={1}
            className={inputCls()}
            value={scenario.warehouseLeadTimeMin}
            onChange={e =>
              onChange('warehouseLeadTimeMin', Number(e.target.value) || DEFAULT_FALLBACK.warehouseLeadTimeMin)
            }
          />
        </label>
      </div>
    </div>
  )
}

const DEFAULT_FALLBACK = {
  safetyFactor: 1.25,
  lotSize: 120,
  warehouseLeadTimeMin: 15
} as const
