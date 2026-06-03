import type { VehicleModel } from '../Types/settings'

/** Product lines shown on the Operations page (not every variant). */
export const MODEL_LINES = ['T4', 'T8', 'T7', 'GD', 'Foton'] as const
export type ModelLine = (typeof MODEL_LINES)[number]

export function modelBelongsToLine(modelName: string, line: ModelLine): boolean {
  const n = modelName.trim().toUpperCase()
  const L = line.toUpperCase()
  if (L === 'FOTON') return n.includes('FOTON')
  if (L === 'GD') return n === 'GD' || n.startsWith('GD')
  return n === L || new RegExp(`^${L}[A-Z]`).test(n)
}

export function getModelIdsForLine(models: VehicleModel[], line: ModelLine): string[] {
  return models.filter(m => modelBelongsToLine(m.name, line)).map(m => m.id)
}

export type ModelLineScope = ModelLine | 'common' | 'other'

/** Per-line colors for tabs, cards, and legend */
export const MODEL_LINE_STYLES: Record<
  ModelLine,
  { tabActive: string; tabIdle: string; cardBorder: string; cardBg: string; badge: string; legendDot: string; ring: string; titleText: string }
> = {
  T4: {
    tabActive: 'bg-cyan-500 text-slate-950',
    tabIdle: 'bg-cyan-950/50 text-cyan-200 hover:bg-cyan-900/60 border border-cyan-500/30',
    cardBorder: 'border-cyan-500/50',
    cardBg: 'bg-cyan-950/25',
    badge: 'bg-cyan-500/20 text-cyan-200',
    legendDot: 'bg-cyan-400',
    ring: 'ring-cyan-400/70',
    titleText: 'text-cyan-300'
  },
  T8: {
    tabActive: 'bg-violet-500 text-white',
    tabIdle: 'bg-violet-950/50 text-violet-200 hover:bg-violet-900/60 border border-violet-500/30',
    cardBorder: 'border-violet-500/50',
    cardBg: 'bg-violet-950/25',
    badge: 'bg-violet-500/20 text-violet-200',
    legendDot: 'bg-violet-400',
    ring: 'ring-violet-400/70',
    titleText: 'text-violet-300'
  },
  T7: {
    tabActive: 'bg-amber-500 text-slate-950',
    tabIdle: 'bg-amber-950/50 text-amber-200 hover:bg-amber-900/60 border border-amber-500/30',
    cardBorder: 'border-amber-500/50',
    cardBg: 'bg-amber-950/25',
    badge: 'bg-amber-500/20 text-amber-200',
    legendDot: 'bg-amber-400',
    ring: 'ring-amber-400/70',
    titleText: 'text-amber-300'
  },
  GD: {
    tabActive: 'bg-emerald-500 text-slate-950',
    tabIdle: 'bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60 border border-emerald-500/30',
    cardBorder: 'border-emerald-500/50',
    cardBg: 'bg-emerald-950/25',
    badge: 'bg-emerald-500/20 text-emerald-200',
    legendDot: 'bg-emerald-400',
    ring: 'ring-emerald-400/70',
    titleText: 'text-emerald-300'
  },
  Foton: {
    tabActive: 'bg-rose-500 text-white',
    tabIdle: 'bg-rose-950/50 text-rose-200 hover:bg-rose-900/60 border border-rose-500/30',
    cardBorder: 'border-rose-500/50',
    cardBg: 'bg-rose-950/25',
    badge: 'bg-rose-500/20 text-rose-200',
    legendDot: 'bg-rose-400',
    ring: 'ring-rose-400/70',
    titleText: 'text-rose-300'
  }
}

export const COMMON_SCOPE_STYLE = {
  tabActive: 'bg-slate-200 text-slate-950',
  tabIdle: 'bg-slate-800 text-slate-300 hover:bg-slate-700',
  cardBorder: 'border-slate-500/40',
  cardBg: 'bg-slate-800/40',
  badge: 'bg-slate-600/40 text-slate-200',
  legendDot: 'bg-slate-400'
}
