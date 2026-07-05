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

  if (deficit <= 0) {
    return <span className="text-slate-400">{display}</span>
  }

  return (
    <button
      type="button"
      onClick={() => onShowReasons(workDate, kind, deficit)}
      className="font-black text-red-400 underline decoration-dotted decoration-red-400/60 underline-offset-2 transition hover:text-red-300"
      title=""
    >
      {display}
    </button>
  )
}
