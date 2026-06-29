import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { labelForPartKindValue, labelForSupplySourceValue, partKindPresetOptions, supplySourcePresetOptions, defaultSupplySourceValue } from '../../Utils/bomPresetOptions'
import { effectivePartKind } from '../../Utils/bomDefaults'
import {
  bomModelBreakdownFamilies,
  lineDraftFromBreakdown,
  type BomModelBreakdownLine,
  type BomModelLineDraft
} from '../../Utils/bomModelBreakdown'
import { BOM_BREAKDOWN_COLUMNS, BOM_BREAKDOWN_COL_WIDTH } from '../../Utils/bomPartsColumns'
import { displayBomStationCode, masterStationsForBom, normalizeBomStationCodeText } from '../../Utils/bomStationCode'
import { isTLineFamily } from '../../Utils/vehicleModelHierarchy'
import type { BomDisplayGroup, BomVariantLine } from '../../Utils/bomRowGroups'
import type { Station, VehicleModel } from '../../Types/settings'
import { BomPresetSelect } from './BomPresetSelect'

type Props = {
  group: BomDisplayGroup
  models: VehicleModel[]
  stations: Station[]
  canUpdate: boolean
  canDelete: boolean
  saving?: boolean
  onSave: (group: BomDisplayGroup, draftByModel: Record<string, BomModelLineDraft>) => Promise<void>
  onEditVariant: (id: string) => void
  onEditGroup: () => void
  onDeleteVariant: (variant: BomVariantLine) => void
}

function defaultExpandedFamilies(families: ReturnType<typeof bomModelBreakdownFamilies>): Set<string> {
  const expanded = new Set<string>()
  for (const fam of families) {
    if (fam.familyId.startsWith('__')) continue
    const hasQty = fam.lines.some(l => l.qty > 0)
    if (hasQty && !isTLineFamily(fam.familyName)) expanded.add(fam.familyId)
  }
  return expanded
}

function patchDraft(
  setDraftByModel: Dispatch<SetStateAction<Record<string, BomModelLineDraft>>>,
  modelName: string,
  patch: Partial<BomModelLineDraft>
) {
  setDraftByModel(prev => ({
    ...prev,
    [modelName]: { ...prev[modelName], ...patch }
  }))
}

function breakdownLabelKey(col: (typeof BOM_BREAKDOWN_COLUMNS)[number]): string {
  if (col === 'active') return 'bom.activeInModel'
  if (col === 'vehicle_model') return 'bom.model'
  return `bom.col.${col}`
}

function VariantRow({
  line,
  group,
  draft,
  canUpdate,
  canDelete,
  showActions,
  stationOptions,
  onEditVariant,
  onEditGroup,
  onDeleteVariant,
  onPatch,
  onToggleActive,
  t
}: {
  line: BomModelBreakdownLine
  group: BomDisplayGroup
  draft: BomModelLineDraft
  canUpdate: boolean
  canDelete: boolean
  showActions: boolean
  stationOptions: string[]
  onEditVariant: (id: string) => void
  onEditGroup: () => void
  onDeleteVariant: (variant: BomVariantLine) => void
  onPatch: (patch: Partial<BomModelLineDraft>) => void
  onToggleActive: (active: boolean) => void
  t: (k: string) => string
}) {
  const inactive = !draft.active
  const partKindPresets = partKindPresetOptions(t)
  const supplyPresets = supplySourcePresetOptions(t)
  const listId = `bom-station-${line.modelName.replace(/\W/g, '_')}`

  return (
    <tr className={`border-b border-slate-800/40 last:border-0 ${inactive ? 'bg-slate-950/30' : 'bg-slate-900/20'}`}>
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-600 accent-cyan-500"
          checked={draft.active}
          disabled={!canUpdate}
          title={t('bom.activeInModel')}
          onChange={e => onToggleActive(e.target.checked)}
        />
      </td>
      <td className="px-2 py-1.5 text-start">
        <span className={`font-bold ${inactive ? 'text-slate-500' : 'text-violet-200'}`}>{line.modelName}</span>
      </td>
      <td className="px-2 py-1.5" dir="ltr">
        {canUpdate ? (
          <>
            <input
              className={`${inputCls()} w-full py-1 font-mono text-xs`}
              list={listId}
              value={draft.station_code_text}
              disabled={inactive}
              placeholder="—"
              onChange={e => onPatch({ station_code_text: e.target.value })}
              onBlur={e => onPatch({ station_code_text: normalizeBomStationCodeText(e.target.value) })}
            />
            <datalist id={listId}>
              {stationOptions.map(code => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </>
        ) : (
          <span className="font-mono text-xs text-cyan-100">{displayBomStationCode(draft.station_code_text) || '—'}</span>
        )}
      </td>
      <td className="px-2 py-1.5" dir="ltr">
        {canUpdate ? (
          <input
            className={`${inputCls()} w-full py-1 font-mono text-xs`}
            value={draft.part_number}
            disabled={inactive}
            placeholder="—"
            onChange={e => onPatch({ part_number: e.target.value })}
          />
        ) : (
          <span className="font-mono text-xs text-cyan-100">{draft.part_number || '—'}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {canUpdate ? (
          <input
            type="number"
            min={0}
            step="any"
            className={`${inputCls()} mx-auto w-full max-w-[4.5rem] py-1 text-center text-sm`}
            value={draft.qty}
            disabled={inactive}
            placeholder="—"
            onChange={e => onPatch({ qty: e.target.value })}
          />
        ) : (
          <span className="font-black tabular-nums text-cyan-300">{line.qty > 0 ? line.qty : '—'}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {canUpdate ? (
          <BomPresetSelect
            value={draft.part_kind}
            presets={partKindPresets}
            disabled={inactive}
            onChange={v => onPatch({ part_kind: v })}
          />
        ) : (
          <span className="text-xs font-bold text-violet-200">{labelForPartKindValue(draft.part_kind, t)}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        {canUpdate ? (
          <BomPresetSelect
            value={draft.supply_source}
            presets={supplyPresets}
            disabled={inactive}
            onChange={v => onPatch({ supply_source: v })}
          />
        ) : (
          <span className="text-xs font-bold text-sky-200">{labelForSupplySourceValue(draft.supply_source, t)}</span>
        )}
      </td>
      {showActions && (
        <td className="bom-actions-col px-2 py-1.5 text-center">
          <div className="flex justify-center gap-0.5">
            {canUpdate && (
              <button
                type="button"
                onClick={() => {
                  if (line.variant?.id) onEditVariant(line.variant.id)
                  else onEditGroup()
                }}
                className="rounded-md bg-orange-500/15 p-1 text-orange-200 hover:bg-orange-500/25"
                title={t('common.edit')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && line.variant?.id && (
              <button
                type="button"
                onClick={() => onDeleteVariant(line.variant!)}
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
  )
}

export function BomModelBreakdownPanel({
  group,
  models,
  stations,
  canUpdate,
  canDelete,
  saving,
  onSave,
  onEditVariant,
  onEditGroup,
  onDeleteVariant
}: Props) {
  const { t } = useLang()
  const families = useMemo(() => bomModelBreakdownFamilies(models, group), [models, group])
  const allLines = useMemo(() => families.flatMap(f => f.lines), [families])
  const stationOptions = useMemo(
    () => masterStationsForBom(stations).map(s => displayBomStationCode(s.station_number)).filter(Boolean),
    [stations]
  )
  const [draftByModel, setDraftByModel] = useState<Record<string, BomModelLineDraft>>({})
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    const next: Record<string, BomModelLineDraft> = {}
    for (const line of allLines) {
      next[line.modelName] = lineDraftFromBreakdown(line, group)
    }
    setDraftByModel(next)
    setExpandedFamilies(defaultExpandedFamilies(families))
    setError('')
  }, [group.key, allLines, families])

  function toggleFamily(familyId: string) {
    setExpandedFamilies(prev => {
      const next = new Set(prev)
      if (next.has(familyId)) next.delete(familyId)
      else next.add(familyId)
      return next
    })
  }

  function toggleActive(modelName: string, active: boolean) {
    const current = draftByModel[modelName] ?? lineDraftFromBreakdown(
      allLines.find(l => l.modelName === modelName)!,
      group
    )
    if (active) {
      const groupStation = group.primary.station_code_text || group.primary.station_number || ''
      patchDraft(setDraftByModel, modelName, {
        active: true,
        qty: current.qty.trim() || '1',
        part_number: current.part_number.trim() || group.primary.part_number || '',
        part_kind: current.part_kind || effectivePartKind(group.primary.part_type),
        supply_source: current.supply_source || defaultSupplySourceValue(group.primary.supply_source),
        station_code_text: current.station_code_text.trim() || groupStation
      })
    } else {
      patchDraft(setDraftByModel, modelName, {
        active: false,
        qty: '',
        part_number: '',
        station_code_text: ''
      })
    }
  }

  async function save() {
    setError('')
    try {
      await onSave(group, draftByModel)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  if (allLines.length === 0) {
    return <p className="text-xs text-slate-500">{t('bom.noVariantsInFamily')}</p>
  }

  const showActions = canUpdate || canDelete
  const colSpan = BOM_BREAKDOWN_COLUMNS.length + (showActions ? 1 : 0)

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{t('bom.modelCardsQtyHint')}</p>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="bom-breakdown-table">
          <colgroup>
            {BOM_BREAKDOWN_COLUMNS.map(c => (
              <col key={c} style={{ width: BOM_BREAKDOWN_COL_WIDTH[c] }} />
            ))}
            {showActions && <col style={{ width: BOM_BREAKDOWN_COL_WIDTH.actions }} />}
          </colgroup>
          <thead>
            <tr>
              {BOM_BREAKDOWN_COLUMNS.map(c => (
                <th key={c} className={c === 'active' ? 'text-center' : c === 'vehicle_model' || c === 'station_code' || c === 'part_number' ? 'text-start' : 'text-center'}>
                  <span className="bom-th-label">{t(breakdownLabelKey(c))}</span>
                </th>
              ))}
              {showActions && (
                <th className="bom-actions-col text-center">
                  <span className="bom-th-label">{t('common.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {families.map(fam => {
              const isOrphan = fam.familyId.startsWith('__')
              const familyOpen = isOrphan || expandedFamilies.has(fam.familyId)
              const activeCount = fam.lines.filter(l => draftByModel[l.modelName]?.active).length
              const label = fam.familyName || t('bom.otherModels')

              if (isOrphan) {
                return fam.lines.map(line => (
                  <VariantRow
                    key={line.modelName}
                    line={line}
                    group={group}
                    draft={draftByModel[line.modelName] ?? lineDraftFromBreakdown(line, group)}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    showActions={showActions}
                    stationOptions={stationOptions}
                    onEditVariant={onEditVariant}
                    onEditGroup={onEditGroup}
                    onDeleteVariant={onDeleteVariant}
                    onPatch={patch => patchDraft(setDraftByModel, line.modelName, patch)}
                    onToggleActive={active => toggleActive(line.modelName, active)}
                    t={t}
                  />
                ))
              }

              return (
                <Fragment key={fam.familyId}>
                  <tr className="border-b border-slate-700/80 bg-slate-900/50">
                    <td colSpan={colSpan} className="!p-0">
                      <button
                        type="button"
                        onClick={() => toggleFamily(fam.familyId)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-start hover:bg-slate-800/60"
                      >
                        {familyOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-cyan-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                        )}
                        <span className="font-black text-cyan-100">{label}</span>
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                          {activeCount}/{fam.lines.length}
                        </span>
                        {activeCount === 0 && (
                          <span className="text-[10px] text-slate-500">{t('bom.familyAllZero')}</span>
                        )}
                      </button>
                    </td>
                  </tr>
                  {familyOpen &&
                    fam.lines.map(line => (
                      <VariantRow
                        key={`${fam.familyId}-${line.modelName}`}
                        line={line}
                        group={group}
                        draft={draftByModel[line.modelName] ?? lineDraftFromBreakdown(line, group)}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        showActions={showActions}
                        stationOptions={stationOptions}
                        onEditVariant={onEditVariant}
                        onEditGroup={onEditGroup}
                        onDeleteVariant={onDeleteVariant}
                        onPatch={patch => patchDraft(setDraftByModel, line.modelName, patch)}
                        onToggleActive={active => toggleActive(line.modelName, active)}
                        t={t}
                      />
                    ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {canUpdate && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      )}
    </div>
  )
}
