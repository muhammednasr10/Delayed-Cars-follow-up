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
      className={`group flex shrink-0 items-center gap-1.5 rounded-xl border transition ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px] sm:text-xs'
      } font-black ${
        active
          ? 'border-cyan-400/50 bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
          : 'border-slate-700/80 bg-slate-800/90 text-slate-300 hover:border-slate-600 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {Icon && (
        <span
          className={`flex items-center justify-center rounded-lg ${
            compact ? 'h-5 w-5' : 'h-6 w-6'
          } ${
            active ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-900 text-cyan-300 group-hover:bg-slate-950'
          }`}
        >
          <Icon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0`} />
        </span>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}
