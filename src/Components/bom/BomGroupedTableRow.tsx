import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Package, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { BOM_MAIN_ROW_COLUMNS, BOM_IPL_MODEL_ROW_COLUMNS } from '../../Utils/bomPartsColumns'
import { bomPartsCellValue } from '../../Utils/bomPartsCellValue'
import { displayBomStationCode, normalizeBomStationCodeText } from '../../Utils/bomStationCode'
import { bomModelBreakdownLines, type BomModelLineDraft } from '../../Utils/bomModelBreakdown'
import type { BomDisplayGroup, BomVariantLine } from '../../Utils/bomRowGroups'
import type { Station, VehicleModel } from '../../Types/settings'
import { inputCls } from '../FormField'
import { StopperChip } from '../StatusChips'
import { BomStopperCell } from './BomStopperCell'
import { BomModelBreakdownPanel } from './BomModelBreakdownPanel'
import { BomIplLogisticsPanel } from './BomIplLogisticsPanel'
import type { BomIplFeedingCard } from '../../Utils/iplBomLogistics'
import { effectiveBomStopperType } from '../../Utils/bomStopper'
import type { StopperType } from '../../Types/enums'

type Props = {
  group: BomDisplayGroup
  models: VehicleModel[]
  stations: Station[]
  expanded: boolean
  onToggle: () => void
  canUpdate: boolean
  canDelete: boolean
  onEdit: () => void
  onEditVariant: (id: string) => void
  onDeleteVariant: (variant: BomVariantLine) => void
  onSaveBreakdown?: (group: BomDisplayGroup, draftByModel: Record<string, BomModelLineDraft>) => Promise<void>
  onSaveIplLogistics?: (itemIds: string[], logistics: BomIplFeedingCard) => Promise<void>
  breakdownSaving?: boolean
  iplSaving?: boolean
  iplModelMode?: boolean
  stationOptions?: { code: string; label: string }[]
  onStationChange?: (group: BomDisplayGroup, stationCode: string) => void
  onIplFieldSave?: (group: BomDisplayGroup, field: 'part_number' | 'qty', value: string) => Promise<void>
  onOpenFeeding?: (group: BomDisplayGroup) => void
  onDeleteRow?: (group: BomDisplayGroup) => void
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
      {modelCount > 0 && (
        <span className="shrink-0 rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-bold text-violet-300">
          {modelCount}
        </span>
      )}
    </button>
  )
}

function stationNameFromOptions(code: string, options?: { code: string; label: string }[]): string {
  if (!code || !options) return ''
  const opt = options.find(o => o.code.toUpperCase() === code.toUpperCase())
  if (!opt?.label) return ''
  const parts = opt.label.split('—').map(s => s.trim())
  return parts.length > 1 ? parts.slice(1).join(' — ') : ''
}

export function BomGroupedTableRow({
  group,
  models,
  stations,
  expanded,
  onToggle,
  canUpdate,
  canDelete,
  onEdit,
  onEditVariant,
  onDeleteVariant,
  onSaveBreakdown,
  onSaveIplLogistics,
  breakdownSaving,
  iplSaving,
  iplModelMode,
  stationOptions,
  onStationChange,
  onIplFieldSave,
  onOpenFeeding,
  onDeleteRow
}: Props) {
  const { t } = useLang()
  const row = group.summary
  const columns = iplModelMode ? BOM_IPL_MODEL_ROW_COLUMNS : BOM_MAIN_ROW_COLUMNS
  const colCount = columns.length
  const breakdown = useMemo(() => bomModelBreakdownLines(models, group), [models, group])
  const activeQtyCount = useMemo(() => breakdown.filter(l => l.qty > 0).length, [breakdown])
  const expandable = !iplModelMode && breakdown.length >= 1

  const stationSelectValue = displayBomStationCode(bomPartsCellValue(row, 'station_code')) || ''
  const stationName = stationNameFromOptions(stationSelectValue, stationOptions)
  const stopper = effectiveBomStopperType(row)

  const [partNumberDraft, setPartNumberDraft] = useState(row.part_number ?? '')
  const [qtyDraft, setQtyDraft] = useState(bomPartsCellValue(row, 'qty_by_model') || '1')

  useEffect(() => {
    setPartNumberDraft(row.part_number ?? '')
    setQtyDraft(bomPartsCellValue(row, 'qty_by_model') || '1')
  }, [group.key, row.part_number, row.quantity])

  async function savePartNumber() {
    const trimmed = partNumberDraft.trim()
    if (!trimmed || trimmed === (row.part_number ?? '').trim()) return
    if (!onIplFieldSave) return
    await onIplFieldSave(group, 'part_number', trimmed)
  }

  async function saveQty() {
    const n = Number(qtyDraft)
    if (!Number.isFinite(n) || n <= 0) {
      setQtyDraft(bomPartsCellValue(row, 'qty_by_model') || '1')
      return
    }
    const current = bomPartsCellValue(row, 'qty_by_model')
    if (String(n) === current || (current === '' && n === 1)) return
    if (!onIplFieldSave) return
    await onIplFieldSave(group, 'qty', String(n))
  }

  return (
    <>
      <tr className={`border-b border-slate-800/80 ${expanded ? 'bg-slate-900/70' : 'hover:bg-slate-900/50'}`}>
        {columns.map(c => {
          if (c === 'actions') {
            return (
              <td key={c} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                      title={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {onOpenFeeding && (
                    <button
                      type="button"
                      onClick={() => onOpenFeeding(group)}
                      className="relative rounded-lg bg-cyan-500/15 p-1.5 text-cyan-300 hover:bg-cyan-500/25"
                      title={
                        stopper !== 'non_stopper'
                          ? `${t('bom.iplLogistics.openFeeding')} · ${t(`bom.stopper${stopper === 'line_stopper' ? 'Line' : 'Car'}`)}`
                          : t('bom.iplLogistics.openFeeding')
                      }
                    >
                      <Package className="h-4 w-4" />
                      {stopper !== 'non_stopper' && (
                        <span className="absolute -end-0.5 -top-0.5 flex">
                          <StopperChip type={stopper as StopperType} />
                        </span>
                      )}
                    </button>
                  )}
                  {canDelete && onDeleteRow && (
                    <button
                      type="button"
                      onClick={() => onDeleteRow(group)}
                      className="rounded-lg bg-red-500/15 p-1.5 text-red-300 hover:bg-red-500/25"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            )
          }

          const title = c === 'operation' ? undefined : bomPartsCellValue(row, c)

          return (
            <td
              key={c}
              dir={c === 'station_code' || c === 'part_name_en' || c === 'part_number' ? 'ltr' : undefined}
              title={title || undefined}
            >
              {c === 'part_name_ar' ? (
                partNameCell(expandable, activeQtyCount, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'part_name_en' && expandable ? (
                partNameCell(expandable, activeQtyCount, expanded, onToggle, bomPartsCellValue(row, c))
              ) : c === 'part_number' && iplModelMode ? (
                canUpdate && onIplFieldSave ? (
                  <input
                    className={`${inputCls()} w-full py-1 text-xs font-mono`}
                    value={partNumberDraft}
                    dir="ltr"
                    onChange={e => setPartNumberDraft(e.target.value)}
                    onBlur={() => void savePartNumber()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                  />
                ) : (
                  <span className="font-mono text-xs">{row.part_number || '—'}</span>
                )
              ) : c === 'qty_by_model' && iplModelMode ? (
                canUpdate && onIplFieldSave ? (
                  <input
                    className={`${inputCls()} w-full py-1 text-center text-xs font-bold`}
                    value={qtyDraft}
                    dir="ltr"
                    inputMode="decimal"
                    onChange={e => setQtyDraft(e.target.value)}
                    onBlur={() => void saveQty()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                  />
                ) : (
                  <span className="font-bold text-cyan-200">{bomPartsCellValue(row, c) || '—'}</span>
                )
              ) : c === 'vehicle_model' ? (
                <span className="font-bold leading-snug text-violet-200" title={group.classByPartNumber || undefined}>
                  {group.classByPartNumber || '—'}
                </span>
              ) : c === 'station_code' ? (
                iplModelMode && canUpdate && onStationChange && stationOptions ? (
                  <div className="min-w-[4.5rem]">
                    <select
                      className={`${inputCls()} w-full py-1 text-xs font-mono font-bold text-cyan-200`}
                      value={stationSelectValue}
                      onChange={e => onStationChange(group, normalizeBomStationCodeText(e.target.value))}
                    >
                      <option value="">{t('bom.partListStationOptional')}</option>
                      {stationSelectValue &&
                        !stationOptions.some(o => o.code === stationSelectValue) && (
                          <option value={stationSelectValue}>{stationSelectValue}</option>
                        )}
                      {stationOptions.map(opt => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code}
                        </option>
                      ))}
                    </select>
                    {stationName && (
                      <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-400" title={stationName}>
                        {stationName}
                      </p>
                    )}
                  </div>
                ) : group.variants.length > 1 && !allVariantsSame(group, 'station_code') ? (
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
            {onSaveIplLogistics && (
              <BomIplLogisticsPanel
                group={group}
                canUpdate={canUpdate}
                saving={iplSaving}
                onSave={onSaveIplLogistics}
              />
            )}
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
              {t('bom.modelBreakdown')}
            </p>
            <BomModelBreakdownPanel
              group={group}
              models={models}
              stations={stations}
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
