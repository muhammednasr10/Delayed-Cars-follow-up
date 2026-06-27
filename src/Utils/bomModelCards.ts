import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE, effectivePartKind, effectiveSupplySource } from './bomDefaults'
import { resolveSupplySource } from './bomDisplayFormat'
import { formatQtyByModelRaw, maxModelQty, modelQtyFromBomRow, parseApplicableModelNames } from './bomQtyByModel'
import { normalizeBomStationCodeText } from './bomStationCode'
import { buildModelFamilyGroups, isAssignableModel } from './vehicleModelHierarchy'
import type { BomItemDetail } from '../Types/bom'
import type { VehicleModel } from '../Types/settings'

export type ModelCardDraft = {
  modelId: string
  modelName: string
  part_number: string
  part_number_new: string
  alternative_part_no: string
  qty: string
  part_kind: string
  supply_source: string
  station_id: string
  station_code_text: string
  bom_classification: string
  station_category: string
}

export function emptyCard(model: VehicleModel, seed?: Partial<ModelCardDraft>): ModelCardDraft {
  return {
    modelId: model.id,
    modelName: model.name,
    part_number: seed?.part_number ?? '',
    part_number_new: seed?.part_number_new ?? '',
    alternative_part_no: seed?.alternative_part_no ?? '',
    qty: seed?.qty ?? '1',
    part_kind: seed?.part_kind ?? DEFAULT_PART_KIND,
    supply_source: seed?.supply_source ?? DEFAULT_SUPPLY_SOURCE,
    station_id: seed?.station_id ?? '',
    station_code_text: seed?.station_code_text ?? '',
    bom_classification: seed?.bom_classification ?? '',
    station_category: seed?.station_category ?? ''
  }
}

export function cardsFromBomRow(models: VehicleModel[], row: BomItemDetail): {
  familyIds: string[]
  cards: ModelCardDraft[]
} {
  const picker = buildModelFamilyGroups(models)
  const familyIds: string[] = []

  if (row.model_family) {
    const fam = models.find(m => m.model_kind === 'family' && m.name === row.model_family)
    if (fam) familyIds.push(fam.id)
  }

  const seed: Partial<ModelCardDraft> = {
    part_number: row.part_number,
    part_number_new: row.part_number_new ?? '',
    alternative_part_no: row.alternative_part_no ?? '',
    part_kind: effectivePartKind(row.part_type),
    supply_source: effectiveSupplySource(row.supply_source ?? resolveSupplySource(row)),
    station_id: row.station_id ?? '',
    station_code_text: row.station_code_text ? normalizeBomStationCodeText(row.station_code_text) : '',
    bom_classification: row.bom_classification ?? '',
    station_category: row.station_category ?? ''
  }

  const qtyEntries = modelQtyFromBomRow(row)
  const cards: ModelCardDraft[] = []

  for (const e of qtyEntries) {
    const m = models.find(x => x.name === e.modelName)
    if (!m) continue
    if (m.parent_model_id && !familyIds.includes(m.parent_model_id)) {
      familyIds.push(m.parent_model_id)
    }
    cards.push(emptyCard(m, { ...seed, qty: String(e.qty) }))
  }

  if (cards.length === 0 && row.vehicle_model_id) {
    const m = models.find(x => x.id === row.vehicle_model_id)
    if (m) {
      if (m.parent_model_id && !familyIds.includes(m.parent_model_id)) familyIds.push(m.parent_model_id)
      cards.push(emptyCard(m, { ...seed, qty: String(row.quantity ?? 1) }))
    }
  }

  if (cards.length === 0) {
    const names = parseApplicableModelNames(row.applicable_models_text)
    for (const name of names) {
      const m = models.find(x => x.name === name)
      if (m) cards.push(emptyCard(m, seed))
    }
  }

  return { familyIds, cards }
}

export function cardsFromBomRows(models: VehicleModel[], rows: BomItemDetail[]): {
  familyIds: string[]
  cards: ModelCardDraft[]
} {
  const familyIds: string[] = []
  const cards: ModelCardDraft[] = []

  for (const row of rows) {
    const parsed = cardsFromBomRow(models, row)
    for (const fid of parsed.familyIds) {
      if (!familyIds.includes(fid)) familyIds.push(fid)
    }
    for (const card of parsed.cards) {
      const idx = cards.findIndex(c => c.modelId === card.modelId)
      if (idx < 0) cards.push(card)
      else cards[idx] = { ...cards[idx], ...card }
    }
  }

  return { familyIds, cards }
}

export function cardsCanConsolidate(cards: ModelCardDraft[]): boolean {
  if (cards.length <= 1) return true
  const f = cards[0]
  return cards.every(
    c =>
      c.part_number.trim() === f.part_number.trim() &&
      c.station_id === f.station_id &&
      c.station_code_text.trim() === f.station_code_text.trim() &&
      c.part_kind === f.part_kind &&
      c.supply_source === f.supply_source &&
      c.bom_classification.trim() === f.bom_classification.trim()
  )
}

export function consolidatedPayload(
  models: VehicleModel[],
  familyIds: string[],
  cards: ModelCardDraft[],
  names: {
    part_name_ar?: string
    part_name_en?: string
    notes?: string
    stopper_type?: 'line_stopper' | 'car_stopper' | 'non_stopper'
  }
) {
  const active = cards.filter(c => {
    const q = Number(c.qty)
    return c.part_number.trim() && c.modelId && Number.isFinite(q) && q > 0
  })
  const first = active[0]
  const familyNames = familyIds
    .map(id => models.find(m => m.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  const entries = active.map(c => ({ modelName: c.modelName, qty: Number(c.qty) }))

  return {
    part_number: first.part_number.trim(),
    part_number_new: first.part_number_new.trim() || undefined,
    alternative_part_no: first.alternative_part_no.trim() || undefined,
    part_name_ar: names.part_name_ar,
    part_name_en: names.part_name_en,
    part_kind: effectivePartKind(first.part_kind),
    quantity: maxModelQty(entries),
    vehicle_model_id: null as string | null,
    station_id: first.station_id || null,
    station_code_text: normalizeBomStationCodeText(first.station_code_text),
    station_category: first.station_category || undefined,
    supply_source: effectiveSupplySource(first.supply_source),
    model_family: familyNames || undefined,
    applicable_models_text: active.map(c => c.modelName).join(', '),
    bom_classification: first.bom_classification || undefined,
    qty_by_model_raw: formatQtyByModelRaw(entries),
    notes: names.notes,
    stopper_type: names.stopper_type ?? 'non_stopper'
  }
}

export function variantsForFamilies(models: VehicleModel[], familyIds: string[]): VehicleModel[] {
  const picker = buildModelFamilyGroups(models)
  if (familyIds.length === 0) {
    return models.filter(isAssignableModel).sort((a, b) => a.name.localeCompare(b.name))
  }
  const out: VehicleModel[] = []
  for (const fid of familyIds) {
    const g = picker.groups.find(x => x.family.id === fid)
    if (g) out.push(...g.variants.filter(isAssignableModel))
  }
  const seen = new Set<string>()
  return out.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

export function familyOptions(models: VehicleModel[]) {
  const picker = buildModelFamilyGroups(models)
  return picker.groups.map(g => g.family)
}
