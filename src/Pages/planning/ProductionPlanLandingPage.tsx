import { CalendarRange, ChevronLeft, LayoutGrid, Target } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useProductionPlanHubStats, type PlanFamilySummaryRow } from '../../hooks/useProductionPlanHubStats'
import { planProgressPercent } from '../../Utils/productionPlanSummary'

function displayQty(value: number, loading: boolean): string {
  if (loading) return '…'
  return value > 0 ? String(value) : '—'
}

function PlanScopeCard({
  title,
  subtitle,
  tone,
  icon: Icon,
  totalPlanned,
  totalAchieved,
  families,
  loading,
  onClick,
  openLabel,
  parentModelsLabel,
  requiredLabel,
  achievedLabel
}: {
  title: string
  subtitle: string
  tone: 'violet' | 'cyan'
  icon: typeof Target
  totalPlanned: number
  totalAchieved: number
  families: PlanFamilySummaryRow[]
  loading: boolean
  onClick: () => void
  openLabel: string
  parentModelsLabel: string
  requiredLabel: string
  achievedLabel: string
}) {
  const shell =
    tone === 'violet'
      ? 'border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-slate-900/95 to-slate-950 hover:border-violet-400/50 hover:shadow-violet-500/10'
      : 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/95 to-slate-950 hover:border-cyan-400/50 hover:shadow-cyan-500/10'
  const iconCls =
    tone === 'violet' ? 'bg-violet-500/15 text-violet-300 ring-violet-400/20' : 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/20'
  const hintCls = tone === 'violet' ? 'text-violet-300/90' : 'text-cyan-300/90'
  const totalCls = tone === 'violet' ? 'border-violet-500/25 bg-violet-500/10 text-violet-100' : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100'
  const rowCls = tone === 'violet' ? 'border-violet-500/15 bg-violet-500/5' : 'border-cyan-500/15 bg-cyan-500/5'
  const progress = planProgressPercent(totalPlanned, totalAchieved)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-full w-full flex-col rounded-2xl border p-4 text-start shadow-lg transition duration-300 sm:p-5 ${shell}`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 rounded-2xl p-3 ring-1 ${iconCls}`}>
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-black text-white sm:text-lg">{title}</h4>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className={`mt-4 grid grid-cols-2 gap-2 rounded-xl border p-3 ${totalCls}`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{requiredLabel}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{displayQty(totalPlanned, loading)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{achievedLabel}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-emerald-200">{displayQty(totalAchieved, loading)}</p>
        </div>
        <div className="col-span-2 border-t border-white/10 pt-2 text-xs font-bold opacity-90">
          {loading ? '…' : `${progress}%`}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>{parentModelsLabel}</span>
          <span className="flex gap-3">
            <span>{requiredLabel}</span>
            <span>{achievedLabel}</span>
          </span>
        </div>
        <div className="max-h-52 space-y-2 overflow-y-auto pe-1">
          {loading ? (
            <p className="py-4 text-center text-sm text-slate-500">…</p>
          ) : families.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">—</p>
          ) : (
            families.map(family => (
              <div
                key={family.key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${rowCls}`}
              >
                <span className="min-w-0 truncate text-sm font-bold text-white">{family.label}</span>
                <div className="flex shrink-0 items-center gap-3 text-sm font-black tabular-nums">
                  <span className="text-slate-200">{family.planned > 0 ? family.planned : '—'}</span>
                  <span className="text-emerald-300">{family.achieved > 0 ? family.achieved : '—'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className={`mt-4 flex items-center gap-1.5 text-xs font-bold transition ${hintCls}`}>
        <span>{openLabel}</span>
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5" />
      </p>
    </button>
  )
}

export function ProductionPlanLandingPage() {
  const { t } = useLang()
  const nav = useNavigation()
  const stats = useProductionPlanHubStats()

  return (
    <section className="space-y-6">
      <div className="card-industrial p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">{t('productionOrders.title')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('productionOrders.planHub.subtitle')}</p>
          </div>
        </div>

        {!stats.loading && (
          <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-slate-300">
            <span className="font-bold text-violet-200">{t('productionOrders.planHub.summary')}: </span>
            {t('productionOrders.planHub.summaryLine', {
              planned: stats.planned || 0,
              achieved: stats.achieved || 0,
              progress: stats.progress
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanScopeCard
          title={t('productionOrders.monthlyPlanSection')}
          subtitle={t('productionOrders.planHub.monthSubtitle', { month: stats.monthValue })}
          tone="violet"
          icon={Target}
          totalPlanned={stats.planned}
          totalAchieved={stats.achieved}
          families={stats.monthlyFamilies}
          loading={stats.loading}
          requiredLabel={t('productionOrders.plannedQty')}
          achievedLabel={t('productionOrders.achievedQty')}
          parentModelsLabel={t('productionOrders.planHub.parentModels')}
          onClick={() => nav.navigate({ department: 'planning', planningTab: 'plan', planScope: 'monthly', showGlobalHome: false })}
          openLabel={t('productionOrders.planHub.openMonthly')}
        />
        <PlanScopeCard
          title={t('productionOrders.annualPlanSection')}
          subtitle={t('productionOrders.planEntry.annualSubtitle', { year: stats.year })}
          tone="cyan"
          icon={CalendarRange}
          totalPlanned={stats.annualPlanned}
          totalAchieved={stats.annualAchieved}
          families={stats.annualFamilies}
          loading={stats.loading}
          requiredLabel={t('productionOrders.plannedQty')}
          achievedLabel={t('productionOrders.achievedQty')}
          parentModelsLabel={t('productionOrders.planHub.parentModels')}
          onClick={() => nav.navigate({ department: 'planning', planningTab: 'plan', planScope: 'annual', showGlobalHome: false })}
          openLabel={t('productionOrders.planHub.openAnnual')}
        />
      </div>

      <p className="px-1 text-center text-[11px] text-slate-500">{t('productionOrders.planHub.annualFromMonthlyHint')}</p>
    </section>
  )
}
