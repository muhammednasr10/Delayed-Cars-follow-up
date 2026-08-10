import { ChevronDown } from 'lucide-react'
import { CompletionBar } from '../VehicleBadges'
import { planProgressPercent, type PlanFamilyGroup } from '../../Utils/productionPlanSummary'

type Props = {
  group: PlanFamilyGroup
  scope: 'monthly' | 'annual'
  isExpanded: boolean
  onToggle: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

function displayQty(n: number | undefined | null): string {
  if (n == null || n === 0) return '—'
  return String(n)
}

function cardShell(scope: 'monthly' | 'annual', progress: number): string {
  if (scope === 'annual') {
    return 'border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-950 hover:border-cyan-400/35'
  }
  if (progress >= 100) {
    return 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-slate-900/90 to-slate-950 hover:border-emerald-400/40'
  }
  if (progress >= 70) {
    return 'border-cyan-500/25 bg-gradient-to-br from-cyan-950/20 via-slate-900/90 to-slate-950 hover:border-cyan-400/35'
  }
  if (progress >= 40) {
    return 'border-violet-500/25 bg-gradient-to-br from-violet-950/25 via-slate-900/90 to-slate-950 hover:border-violet-400/35'
  }
  return 'border-slate-700/50 bg-gradient-to-br from-slate-900/90 to-slate-950 hover:border-slate-600/60'
}

function HeaderStat({
  label,
  value,
  tone = 'slate'
}: {
  label: string
  value: string
  tone?: 'cyan' | 'emerald' | 'violet' | 'slate'
}) {
  const valueCls =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'emerald'
        ? 'text-emerald-300'
        : tone === 'violet'
          ? 'text-violet-300'
          : 'text-slate-200'

  return (
    <div className="min-w-[4.5rem] px-2 py-1 text-center sm:min-w-[5rem] sm:px-3">
      <p className="truncate text-[9px] font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-black tabular-nums leading-none sm:text-lg ${valueCls}`}>{value}</p>
    </div>
  )
}

export function PlanFamilyCard({ group, scope, isExpanded, onToggle, t }: Props) {
  const variantIds = group.variants.map(v => v.modelId)
  const familyIsLeaf = variantIds.length === 1 && variantIds[0] === group.familyId
  const progress = planProgressPercent(group.planned, group.achieved)

  const modeLabel =
    group.entryMode === 'family_aggregate'
      ? t('productionOrders.planModeFamily')
      : group.entryMode === 'per_variant'
        ? t('productionOrders.planModeVariants')
        : t('productionOrders.planModeFlexible')

  const plannedDisplay =
    !familyIsLeaf && group.entryMode === 'per_variant' && group.planned <= 0 ? '—' : displayQty(group.planned)

  const statsBorder = scope === 'annual' ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-violet-500/20 bg-violet-500/5'

  return (
    <article
      className={`overflow-hidden rounded-xl border shadow-sm transition-all duration-200 ${cardShell(scope, progress)} ${
        !familyIsLeaf ? 'hover:shadow-lg hover:shadow-black/20' : ''
      }`}
    >
      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggle}
            disabled={familyIsLeaf}
            className={`inline-flex min-w-0 flex-1 items-center gap-2 text-start ${familyIsLeaf ? 'cursor-default' : 'group'}`}
            aria-expanded={isExpanded}
          >
            {!familyIsLeaf && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-950/60">
                <ChevronDown
                  className={`h-4 w-4 text-violet-300 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0' : '-rotate-90 rtl:rotate-90'
                  }`}
                />
              </span>
            )}
            <div className="min-w-0">
              <h4 className="truncate text-sm font-black text-white sm:text-base">{group.label}</h4>
              {!familyIsLeaf && (
                <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
                  {t('productionOrders.planCard.variants', { n: group.variants.length })} · {modeLabel}
                </p>
              )}
            </div>
          </button>

          <div
            className={`flex shrink-0 divide-x divide-slate-700/60 overflow-hidden rounded-xl border ${statsBorder}`}
          >
            <HeaderStat label={t('productionOrders.plannedQty')} value={plannedDisplay} tone="cyan" />
            <HeaderStat label={t('productionOrders.achievedQty')} value={displayQty(group.achieved)} tone="emerald" />
            <HeaderStat label={t('productionOrders.progress')} value={`${progress}%`} tone="violet" />
          </div>
        </div>
      </div>

      {isExpanded && !familyIsLeaf && (
        <div className="border-t border-slate-800/80 bg-slate-950/80 px-3 py-3 sm:px-4">
          {scope === 'monthly' && group.wipCarryover > 0 && (
            <div className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>{t('productionOrders.wipCarryoverShort')}</span>
                <span className="text-rose-300">{displayQty(group.wipCarryover)}</span>
              </div>
              <CompletionBar percent={progress} />
            </div>
          )}

          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t('productionOrders.planCard.variantsTitle')}
          </p>
          <div className="space-y-1.5">
            {group.variants.map(variant => {
              const showVariantQty = group.entryMode !== 'family_aggregate'
              const variantProgress = planProgressPercent(variant.planned, variant.achieved)

              if (scope === 'annual') {
                return (
                  <div
                    key={variant.modelId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2"
                  >
                    <p className="truncate text-sm font-bold text-slate-200">{variant.label}</p>
                    <p className="text-sm font-black tabular-nums text-cyan-300">
                      {showVariantQty ? displayQty(variant.planned) : '—'}
                    </p>
                  </div>
                )
              }

              return (
                <div
                  key={variant.modelId}
                  className="grid grid-cols-[1fr_repeat(3,minmax(3.5rem,auto))] items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2"
                >
                  <p className="truncate text-sm font-bold text-slate-200">{variant.label}</p>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-500">{t('productionOrders.plannedQty')}</p>
                    <p className="text-sm font-black tabular-nums text-cyan-200">
                      {showVariantQty ? displayQty(variant.planned) : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-500">{t('productionOrders.wipCarryoverShort')}</p>
                    <p className="text-sm font-black tabular-nums text-rose-300">
                      {showVariantQty ? displayQty(variant.wipCarryover) : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-500">{t('productionOrders.achievedQty')}</p>
                    <p className="text-sm font-black tabular-nums text-emerald-300">
                      {displayQty(variant.achieved)} · {variantProgress}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </article>
  )
}

export function formatGap(gap: number): string {
  if (gap === 0) return '0'
  return gap > 0 ? `+${gap}` : String(gap)
}

export function gapToneClass(gap: number): string {
  if (gap > 0) return 'text-amber-300'
  if (gap < 0) return 'text-red-300'
  return 'text-slate-300'
}
