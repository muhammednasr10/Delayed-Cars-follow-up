import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  icon?: LucideIcon
  active?: boolean
  onClick: () => void
  compact?: boolean
}

export function NavTabButton({ label, icon: Icon, active, onClick, compact }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 items-center gap-2 rounded-xl border transition ${
        compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs sm:text-sm'
      } font-black ${
        active
          ? 'border-cyan-400/50 bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
          : 'border-slate-700/80 bg-slate-800/90 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {Icon && (
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            active ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-900 text-cyan-300 group-hover:bg-slate-950'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </span>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}
