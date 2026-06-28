import { useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { BOM_MAIN_ROW_COLUMNS } from '../../Utils/bomPartsColumns'
import { bomPartsCellValue } from '../../Utils/bomPartsCellValue'
import { displayBomStationCode } from '../../Utils/bomStationCode'
import { bomModelBreakdownLines, type BomModelLineDraft } from '../../Utils/bomModelBreakdown'
import type { BomDisplayGroup, BomVariantLine } from '../../Utils/bomRowGroups'
import type { VehicleModel } from '../../Types/settings'
import { BomStopperCell } from './BomStopperCell'
import { BomModelBreakdownPanel } from './BomModelBreakdownPanel'

type Props = {
  group: BomDisplayGroup
  models: VehicleModel[]
  expanded: boolean
  onToggle: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onEditVariant: (id: string) => void
  onDeleteVariant: (variant: BomVariantLine) => void
  onSaveBreakdown?: (group: BomDisplayGroup, draftByModel: Record<string, BomModelLineDraft>) => Promise<void>
  breakdownSaving?: boolean
}

function partNameCell(
  expandable: boolean,
  modelCount: number,
  expanded: boolean,
  onToggle: () => void,
  label: string
) {
  if (!expandable) {
    return <span className="leading-snug">{label || '—'}</span>
  }
  return (
    <button
      type="button"
      className="mx-auto flex max-w-full items-center justify-center gap-1 text-center leading-snug text-cyan-100 hover:text-cyan-50"
      onClick={e => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {expanded ? (
        <ChevronUp className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      )}
      <span className="min-w-0">{label || '—'}</span>
      <span className="shrink-0 rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-bold text-violet-300">
        {modelCount}
      </span>
    </button>
  )
}

export function BomGroupedTableRow({
  group,
  models,
  expanded,
  onToggle,
  canUpdate,
  canDelete,
  onEdit,
  onEditVariant,
  onDeleteVariant,
  onSaveBreakdown,
  breakdownSaving
}: Props) {
  const { t } = useLang()
  const row = group.summary
  const colCount = BOM_MAIN_ROW_COLUMNS.length
  const breakdown = useMemo(() => bomModelBreakdownLines(models, group), [models, group])
  const expandable = breakdown.length >= 1

  return (
    <>
      <tr
        className={`border-b border-slate-800/80 ${expanded ? 'bg-slate-900/70' : 'hover:bg-slate-900/50'}`}
      >
        {BOM_MAIN_ROW_COLUMNS.map(c => {
          const title =
            c === 'operation' ? undefined : bomPartsCellValue(row, c)

          return (
            <td
              key={c}
              dir={c === 'station_code' || c === 'part_name_en' ? 'ltr' : undefined}
              title={title || undefined}
            >
              {c === 'part_name_ar' ? (
                partNameCell(expandable, breakdown.length, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'part_name_en' && expandable ? (
                partNameCell(expandable, breakdown.length, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'vehicle_model' ? (
                <span className="font-bold leading-snug text-violet-200" title={group.classByPartNumber || undefined}>
                  {group.classByPartNumber || '—'}
                </span>
              ) : c === 'station_code' ? (
                group.variants.length > 1 && !allVariantsSame(group, 'station_code') ? (
                  <span className="text-slate-500">{t('bom.multiple')}</span>
                ) : (
                  <span className="font-mono font-bold text-cyan-200" dir="ltr">
                    {displayBomStationCode(bomPartsCellValue(row, c)) || '—'}
                  </span>
                )
              ) : c === 'operation' ? (
                <BomStopperCell row={row} compact />
              ) : (
                <span className="leading-snug">{bomPartsCellValue(row, c) || '—'}</span>
              )}
            </td>
          )
        })}
      </tr>

      {expanded && expandable && (
        <tr className="border-b border-slate-800/80 bg-slate-950/80">
          <td colSpan={colCount} className="!px-3 !py-2">
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
              {t('bom.modelBreakdown')}
            </p>
            <BomModelBreakdownPanel
              group={group}
              models={models}
              canUpdate={canUpdate && Boolean(onSaveBreakdown)}
              canDelete={canDelete}
              saving={breakdownSaving}
              onEditGroup={onEdit}
              onEditVariant={onEditVariant}
              onDeleteVariant={onDeleteVariant}
              onSave={async (g, draftByModel) => {
                if (!onSaveBreakdown) return
                await onSaveBreakdown(g, draftByModel)
              }}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function allVariantsSame(
  group: BomDisplayGroup,
  field: 'part_kind' | 'supply_source' | 'station_code'
): boolean {
  const vals = group.variants.map(v => v[field]?.trim() ?? '').filter(Boolean)
  if (vals.length <= 1) return true
  return vals.every(v => v === vals[0])
}
