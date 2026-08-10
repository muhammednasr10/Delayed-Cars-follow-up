import type { ProductivityDelayKind } from '../../Types/productivityDelayReason'

type Props = {
  deficit: number
  display: string
  workDate: string
  kind: ProductivityDelayKind
  onShowReasons: (workDate: string, kind: ProductivityDelayKind, deficit: number) => void
}

export function ProductivityDeficitCell({ deficit, display, workDate, kind, onShowReasons }: Props) {
  if (display === '—') return <>—</>

  const toneCls = deficit <= 0 ? 'text-slate-400' : 'text-red-400'

  return (
    <button
      type="button"
      onClick={() => onShowReasons(workDate, kind, deficit)}
      className={`font-black tabular-nums underline decoration-dotted underline-offset-2 transition hover:text-red-300 ${toneCls} ${
        deficit > 0 ? 'decoration-red-400/60' : 'decoration-slate-500/50'
      }`}
    >
      {display}
    </button>
  )
}
