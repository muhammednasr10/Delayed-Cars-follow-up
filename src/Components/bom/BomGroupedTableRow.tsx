import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { BOM_PARTS_DISPLAY_COLUMNS } from '../../Utils/bomPartsColumns'
import { bomPartsCellValue } from '../../Utils/bomPartsCellValue'
import { displayBomStationCode } from '../../Utils/bomStationCode'
import { classLabelForVariant, partKindLabel, supplySourceLabel } from '../../Utils/bomDisplayFormat'
import type { BomVariantLine, BomDisplayGroup } from '../../Utils/bomRowGroups'
import { BomQuantityCell } from './BomQuantityCell'
import { BomPartKindCell } from './BomPartKindCell'
import { BomSupplySourceCell } from './BomSupplySourceCell'
import { BomStopperCell } from './BomStopperCell'

type Props = {
  group: BomDisplayGroup
  expanded: boolean
  onToggle: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onEditVariant: (id: string) => void
  onDeleteVariant: (variant: BomVariantLine) => void
}

function formatQty(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

function partNameCell(
  group: BomDisplayGroup,
  expanded: boolean,
  onToggle: () => void,
  label: string
) {
  if (!group.expandable) {
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
        {group.variants.length}
      </span>
    </button>
  )
}

export function BomGroupedTableRow({
  group,
  expanded,
  onToggle,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onEditVariant,
  onDeleteVariant
}: Props) {
  const { t } = useLang()
  const row = group.summary
  const colCount = BOM_PARTS_DISPLAY_COLUMNS.length + (canUpdate || canDelete ? 1 : 0)

  return (
    <>
      <tr
        className={`border-b border-slate-800/80 ${expanded ? 'bg-slate-900/70' : 'hover:bg-slate-900/50'}`}
      >
        {BOM_PARTS_DISPLAY_COLUMNS.map(c => {
          const title =
            c === 'qty_by_model' || c === 'part_kind' || c === 'supply_source'
              ? undefined
              : c === 'bom_classification'
                ? group.classByPartNumber
                : bomPartsCellValue(row, c)

          return (
            <td
              key={c}
              dir={c === 'part_number' || c === 'station_code' || c === 'part_name_en' ? 'ltr' : undefined}
              title={title || undefined}
            >
              {c === 'part_name_ar' ? (
                partNameCell(group, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'part_name_en' && group.expandable ? (
                partNameCell(group, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'vehicle_model' ? (
                <span className="font-bold leading-snug text-violet-200">
                  {bomPartsCellValue(row, c) || '—'}
                </span>
              ) : c === 'qty_by_model' ? (
                <BomQuantityCell row={row} compact />
              ) : c === 'part_kind' ? (
                group.variants.length > 1 && !allVariantsSame(group, 'part_kind') ? (
                  <span className="text-slate-500">{t('bom.multiple')}</span>
                ) : (
                  <BomPartKindCell row={row} compact />
                )
              ) : c === 'supply_source' ? (
                group.variants.length > 1 && !allVariantsSame(group, 'supply_source') ? (
                  <span className="text-slate-500">{t('bom.multiple')}</span>
                ) : (
                  <BomSupplySourceCell row={row} compact />
                )
              ) : c === 'station_code' ? (
                group.variants.length > 1 && !allVariantsSame(group, 'station_code') ? (
                  <span className="text-slate-500">{t('bom.multiple')}</span>
                ) : (
                  <span className="font-mono font-bold text-cyan-200" dir="ltr">
                    {displayBomStationCode(bomPartsCellValue(row, c)) || '—'}
                  </span>
                )
              ) : c === 'bom_classification' ? (
                <span className="font-bold leading-snug text-violet-300/90">{group.classByPartNumber || '—'}</span>
              ) : c === 'operation' ? (
                <BomStopperCell row={row} compact />
              ) : (
                <span className="leading-snug">{bomPartsCellValue(row, c) || '—'}</span>
              )}
            </td>
          )
        })}
        {(canUpdate || canDelete) && (
          <td className="bom-actions-col text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center gap-0.5">
              {canUpdate && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-md bg-orange-500/15 p-1 text-orange-200 hover:bg-orange-500/25"
                  title={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md bg-red-500/15 p-1 text-red-200 hover:bg-red-500/25"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {expanded && group.expandable && (
        <tr className="border-b border-slate-800/80 bg-slate-950/80">
          <td colSpan={colCount} className="!px-3 !py-2">
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
              {t('bom.modelBreakdown')}
            </p>
            <div className="rounded-lg border border-slate-800">
              <table className="bom-parts-table w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th style={{ width: '8%' }}>{t('bom.col.station_code')}</th>
                    <th style={{ width: '10%' }}>{t('bom.model')}</th>
                    <th style={{ width: '14%' }}>{t('bom.col.part_number')}</th>
                    <th style={{ width: '8%' }} className="text-center">
                      {t('bom.col.qty_by_model')}
                    </th>
                    <th style={{ width: '22%' }}>{t('bom.col.bom_classification')}</th>
                    <th style={{ width: '10%' }}>{t('bom.col.part_kind')}</th>
                    <th style={{ width: '10%' }}>{t('bom.col.supply_source')}</th>
                    {(canUpdate || canDelete) && (
                      <th className="bom-actions-col">{t('common.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group.variants.map(v => (
                    <tr key={`${v.id}-${v.modelName}`} className="border-b border-slate-800/60 last:border-0">
                      <td className="font-mono font-bold text-cyan-200" dir="ltr">
                        {displayBomStationCode(v.station_code) || '—'}
                      </td>
                      <td className="font-bold text-violet-200">{v.modelName || '—'}</td>
                      <td className="font-mono" dir="ltr">
                        {v.part_number || '—'}
                      </td>
                      <td>
                        <span className="inline-flex min-w-[1.5rem] justify-center rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-cyan-300">
                          {formatQty(v.qty)}
                        </span>
                      </td>
                      <td className="font-bold text-violet-300/90">
                        {classLabelForVariant(group.variants, v) || '—'}
                      </td>
                      <td>{partKindLabel(v.part_kind, t) || '—'}</td>
                      <td>{supplySourceLabel(v.supply_source, t)}</td>
                      {(canUpdate || canDelete) && (
                        <td className="bom-actions-col">
                          <div className="flex justify-center gap-0.5">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => onEditVariant(v.id)}
                                className="rounded-md bg-orange-500/15 p-1 text-orange-200 hover:bg-orange-500/25"
                                title={t('common.edit')}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => onDeleteVariant(v)}
                                className="rounded-md bg-red-500/15 p-1 text-red-200 hover:bg-red-500/25"
                                title={t('common.delete')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
