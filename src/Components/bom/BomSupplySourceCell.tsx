import { useLang } from '../../i18n/LanguageContext'
import type { BomItemDetail } from '../../Types/bom'
import { normalizeSupplySource, resolveSupplySource, supplySourceLabel } from '../../Utils/bomDisplayFormat'

export function BomSupplySourceCell({ row, compact }: { row: BomItemDetail; compact?: boolean }) {
  const { t } = useLang()
  const raw = resolveSupplySource(row)
  const label = supplySourceLabel(raw, t)
  const n = normalizeSupplySource(raw)
  const cls = n === 'CKD' ? 'bg-sky-500/15 text-sky-200' : 'bg-emerald-500/15 text-emerald-200'
  return (
    <span
      className={`inline-block rounded font-bold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'rounded-md px-2 py-0.5 text-[11px] whitespace-nowrap'} ${cls}`}
    >
      {label}
    </span>
  )
}
