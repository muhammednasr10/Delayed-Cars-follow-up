import type { BomItemDetail } from '../../Types/bom'

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

export function BomQuantityCell({ row, compact }: { row: BomItemDetail; compact?: boolean }) {
  const n = Number(row.quantity)
  const breakdown = row.qty_by_model_raw?.trim()
  if (!Number.isFinite(n) || n <= 0) {
    return <span className="text-slate-500">—</span>
  }
  const title = breakdown || (row.vehicle_model_name ? `${row.vehicle_model_name}: ${formatQty(n)}` : formatQty(n))
  return (
    <span
      className={`inline-flex items-center justify-center rounded bg-cyan-500/15 font-black tabular-nums text-cyan-300 ${
        compact ? 'min-w-[1.5rem] px-1.5 py-0.5 text-[10px]' : 'min-w-[2.25rem] rounded-lg px-2 py-0.5 text-sm'
      }`}
      title={title}
    >
      {formatQty(n)}
    </span>
  )
}
