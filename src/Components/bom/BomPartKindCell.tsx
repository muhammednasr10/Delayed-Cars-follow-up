import { useLang } from '../../i18n/LanguageContext'
import type { BomItemDetail } from '../../Types/bom'
import { formatPartKind, partKindLabel } from '../../Utils/bomDisplayFormat'

export function BomPartKindCell({ row, compact }: { row: BomItemDetail; compact?: boolean }) {
  const { t } = useLang()
  const label = partKindLabel(row.part_type, t)
  const kind = formatPartKind(row.part_type)
  const cls =
    kind === 'part'
      ? 'bg-violet-500/15 text-violet-200'
      : kind === 'hardware'
        ? 'bg-amber-500/15 text-amber-200'
        : kind === 'plastics'
          ? 'bg-fuchsia-500/15 text-fuchsia-200'
          : 'bg-slate-700/50 text-slate-300'
  return (
    <span
      className={`inline-block rounded font-bold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'rounded-md px-2 py-0.5 text-[11px] whitespace-nowrap'} ${cls}`}
    >
      {label}
    </span>
  )
}
