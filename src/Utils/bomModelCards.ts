import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE, effectivePartKind, effectiveSupplySource } from './bomDefaults'
import { resolveSupplySource } from './bomDisplayFormat'
import { formatQtyByModelRaw, maxModelQty, modelQtyFromBomRow, parseApplicableModelNames } from './bomQtyByModel'
import { normalizeBomStationCodeText } from './bomStationCode'
import {
  bomModelBreakdownFamilies,
  lineDraftFromBreakdown,
  type BomModelLineDraft
} from './bomModelBreakdown'
import { buildModelFamilyGroups, inferParentNameFromVariant, isAssignableModel } from './vehicleModelHierarchy'
import type { BomDisplayGroup } from './bomRowGroups'
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

  if (!familyIds.length && qtyEntries.length > 0) {
    const inferred = inferParentNameFromVariant(qtyEntries[0].modelName)
    const fam = models.find(m => m.model_kind === 'family' && m.name === inferred)
    if (fam) familyIds.push(fam.id)
  }

  return { familyIds, cards: syncModelCardsWithFamilies(models, familyIds, cards) }
}

export function syncModelCardsWithFamilies(
  models: VehicleModel[],
  familyIds: string[],
  existing: ModelCardDraft[]
): ModelCardDraft[] {
  const variants = variantsForFamilies(models, familyIds)
  if (variants.length === 0) return []

  const seed = existing.find(c => c.part_number.trim()) ?? existing[0]
  const seedFields: Partial<ModelCardDraft> | undefined = seed
    ? {
        part_number: seed.part_number,
        part_number_new: seed.part_number_new,
        alternative_part_no: seed.alternative_part_no,
        part_kind: seed.part_kind,
        supply_source: seed.supply_source,
        station_id: seed.station_id,
        station_code_text: seed.station_code_text,
        station_category: seed.station_category
      }
    : undefined

  return variants.map(m => {
    const cur = existing.find(c => c.modelId === m.id)
    if (cur) return cur
    return emptyCard(m, seedFields ? { ...seedFields, qty: '0' } : { qty: '0' })
  })
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
      else if (Number(card.qty) > 0) cards[idx] = { ...cards[idx], ...card }
    }
  }

  return { familyIds, cards: syncModelCardsWithFamilies(models, familyIds, cards) }
}

/** Build save cards from inline breakdown editor draft (all families / variants). */
export function buildBreakdownSaveCards(
  models: VehicleModel[],
  group: BomDisplayGroup,
  rows: BomItemDetail[],
  draftByModel: Record<string, BomModelLineDraft>
): { familyIds: string[]; cards: ModelCardDraft[] } {
  const parsed = cardsFromBomRows(models, rows)
  const families = bomModelBreakdownFamilies(models, group)
  const familyIds = families.filter(f => !f.familyId.startsWith('__')).map(f => f.familyId)
  const row = rows[0]
  const seedCard = parsed.cards.find(c => c.part_number.trim()) ?? parsed.cards[0]
  const seed: Partial<ModelCardDraft> = seedCard
    ? {
        part_number_new: seedCard.part_number_new,
        alternative_part_no: seedCard.alternative_part_no,
        station_id: seedCard.station_id,
        station_code_text: seedCard.station_code_text,
        bom_classification: seedCard.bom_classification,
        station_category: seedCard.station_category
      }
    : {
        part_number: row?.part_number ?? '',
        part_kind: effectivePartKind(row?.part_type),
        supply_source: effectiveSupplySource(row?.supply_source ?? resolveSupplySource(row)),
        station_id: row?.station_id ?? '',
        station_code_text: row?.station_code_text ? normalizeBomStationCodeText(row.station_code_text) : ''
      }

  const cards: ModelCardDraft[] = []
  for (const fam of families) {
    for (const line of fam.lines) {
      const m = models.find(x => x.id === line.modelId) ?? models.find(x => x.name === line.modelName)
      if (!m) continue
      const draft = draftByModel[line.modelName] ?? lineDraftFromBreakdown(line, group)
      const existing = parsed.cards.find(c => c.modelId === m.id)
      cards.push({
        ...(existing ?? emptyCard(m, seed)),
        modelId: m.id,
        modelName: m.name,
        part_number: draft.part_number.trim(),
        qty: draft.qty ?? '0',
        part_kind: effectivePartKind(draft.part_kind || existing?.part_kind),
        supply_source: effectiveSupplySource(draft.supply_source || existing?.supply_source)
      })
    }
  }

  return {
    familyIds: familyIds.length > 0 ? familyIds : parsed.familyIds,
    cards
  }
}

/** Map existing BOM rows to model names for per-variant updates. */
export function bomRowsByModelName(models: VehicleModel[], rows: BomItemDetail[]): Map<string, BomItemDetail> {
  const map = new Map<string, BomItemDetail>()
  for (const row of rows) {
    for (const e of modelQtyFromBomRow(row)) {
      if (e.modelName) map.set(e.modelName, row)
    }
    if (row.vehicle_model_id) {
      const m = models.find(x => x.id === row.vehicle_model_id)
      if (m) map.set(m.name, row)
    }
    for (const name of parseApplicableModelNames(row.applicable_models_text)) {
      if (!map.has(name)) map.set(name, row)
    }
  }
  return map
}

export function familyIdForModel(models: VehicleModel[], modelId: string): string | null {
  const m = models.find(x => x.id === modelId)
  if (!m?.parent_model_id) return null
  const fam = models.find(x => x.id === m.parent_model_id && x.model_kind === 'family')
  return fam?.id ?? null
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
