import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { buildModelFamilyGroups, isAssignableModel } from '../../Utils/vehicleModelHierarchy'
import { formatQtyByModelRaw, maxModelQty, modelQtyFromBomRow } from '../../Utils/bomQtyByModel'
import type { VehicleModel } from '../../Types/settings'

export type ModelQtyLine = {
  modelId: string
  modelName: string
  qty: string
}

type Props = {
  models: VehicleModel[]
  familyId: string
  lines: ModelQtyLine[]
  onFamilyChange: (familyId: string) => void
  onLinesChange: (lines: ModelQtyLine[]) => void
}

export function BomModelQtyPicker({ models, familyId, lines, onFamilyChange, onLinesChange }: Props) {
  const { t } = useLang()
  const picker = useMemo(() => buildModelFamilyGroups(models), [models])

  const families = useMemo(
    () => [...picker.groups.map(g => g.family), ...picker.orphanVariants.filter(m => m.model_kind === 'family')],
    [picker]
  )

  const variants = useMemo(() => {
    if (!familyId) {
      return models.filter(isAssignableModel).sort((a, b) => a.name.localeCompare(b.name))
    }
    const group = picker.groups.find(g => g.family.id === familyId)
    if (group) return group.variants.filter(isAssignableModel)
    return picker.orphanVariants.filter(isAssignableModel)
  }, [familyId, models, picker])

  const selectedIds = new Set(lines.map(l => l.modelId))

  function toggleModel(model: VehicleModel, checked: boolean) {
    if (checked) {
      if (selectedIds.has(model.id)) return
      onLinesChange([...lines, { modelId: model.id, modelName: model.name, qty: '1' }])
    } else {
      onLinesChange(lines.filter(l => l.modelId !== model.id))
    }
  }

  function setQty(modelId: string, qty: string) {
    onLinesChange(lines.map(l => (l.modelId === modelId ? { ...l, qty } : l)))
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <Field label={t('bom.col.model_family')}>
        <select
          className={inputCls()}
          value={familyId}
          onChange={e => {
            onFamilyChange(e.target.value)
            onLinesChange([])
          }}
        >
          <option value="">{t('bom.selectFamily')}</option>
          {families.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <span className="mb-2 block text-sm font-bold text-slate-300">{t('bom.col.applicable_models')}</span>
        {variants.length === 0 ? (
          <p className="text-xs text-slate-500">{t('bom.noVariantsInFamily')}</p>
        ) : (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            {variants.map(m => {
              const line = lines.find(l => l.modelId === m.id)
              const checked = Boolean(line)
              return (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-950/40 px-2 py-1.5"
                >
                  <label className="flex min-w-[7rem] cursor-pointer items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600"
                      checked={checked}
                      onChange={e => toggleModel(m, e.target.checked)}
                    />
                    <span className="font-bold text-violet-200">{m.name}</span>
                  </label>
                  {checked && (
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{t('bom.qtyPerCar')}</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={`${inputCls()} w-24 py-1 text-sm`}
                        value={line?.qty ?? '1'}
                        onChange={e => setQty(m.id, e.target.value)}
                      />
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function linesFromBomRow(
  models: VehicleModel[],
  row: {
    model_family?: string | null
    qty_by_model_raw?: string | null
    applicable_models_text?: string | null
    vehicle_model_id?: string | null
    vehicle_model_name?: string | null
    quantity?: number
  }
): { familyId: string; lines: ModelQtyLine[] } {
  const entries = modelQtyFromBomRow(row)
  const picker = buildModelFamilyGroups(models)

  let familyId = ''
  if (row.model_family) {
    const fam = models.find(m => m.model_kind === 'family' && m.name === row.model_family)
    if (fam) familyId = fam.id
  }
  if (!familyId && entries.length > 0) {
    const first = models.find(m => m.name === entries[0].modelName)
    if (first?.parent_model_id) familyId = first.parent_model_id
  }

  const lines: ModelQtyLine[] = []
  for (const e of entries) {
    const m = models.find(x => x.name === e.modelName)
    if (m) lines.push({ modelId: m.id, modelName: m.name, qty: String(e.qty) })
  }

  if (lines.length === 0 && row.vehicle_model_id) {
    const m = models.find(x => x.id === row.vehicle_model_id)
    if (m) {
      lines.push({ modelId: m.id, modelName: m.name, qty: String(row.quantity ?? 1) })
      if (!familyId && m.parent_model_id) familyId = m.parent_model_id
    }
  }

  return { familyId, lines }
}

export function payloadFromModelLines(
  models: VehicleModel[],
  familyId: string,
  lines: ModelQtyLine[]
): {
  model_family: string | null
  applicable_models_text: string
  qty_by_model_raw: string
  quantity: number
  vehicle_model_id: string | null
} {
  const active = lines.filter(l => {
    const q = Number(l.qty)
    return l.modelId && Number.isFinite(q) && q > 0
  })
  if (active.length === 0) {
    return {
      model_family: null,
      applicable_models_text: '',
      qty_by_model_raw: '',
      quantity: 1,
      vehicle_model_id: null
    }
  }

  const family = models.find(m => m.id === familyId)
  const entries = active.map(l => ({
    modelName: l.modelName,
    qty: Number(l.qty)
  }))

  return {
    model_family: family?.name ?? null,
    applicable_models_text: active.map(l => l.modelName).join(', '),
    qty_by_model_raw: formatQtyByModelRaw(entries),
    quantity: maxModelQty(entries),
    vehicle_model_id: active.length === 1 ? active[0].modelId : null
  }
}
