import type { BomItemCreateInput, BomItemDetail, Part } from '../Types/bom'
import type { VehicleModel } from '../Types/settings'
import { bomRowsToModelCards, cardsCanConsolidate, consolidatedPayload, partitionIplModelCards, type ModelCardDraft } from '../Utils/bomModelCards'
import { effectivePartKind, effectiveSupplySource } from '../Utils/bomDefaults'
import { normalizeBomStationCodeText } from '../Utils/bomStationCode'
import { iplFeedingHasContent } from '../Utils/iplBomLogistics'
import {
  createPartMaster,
  getPartById,
  updatePartMaster,
  type PartMasterInput
} from './partsService'
import {
  client,
  updateBomItem,
  createBomItem,
  fetchBomRowsForPart
} from './bomCrudService'
import {
  ensureBomLineForPart,
  ensureIplNotFittedLine,
  updateBomIplFeedingCard,
  deactivateAllBomItemsForPart
} from './bomIplService'

export async function fetchBomCardsForPartMaster(
  partId: string,
  models: VehicleModel[]
): Promise<{ familyIds: string[]; cards: ModelCardDraft[] }> {
  const rows = await fetchBomRowsForPart(partId)
  return bomRowsToModelCards(models, rows)
}

/** Sync IPL bom_items lines from parts-list master model cards (source of truth for part numbers). */
export async function syncPartMasterModelCards(
  partId: string,
  master: Pick<PartMasterInput, 'part_name_ar' | 'part_name_en' | 'common_station'>,
  cards: ModelCardDraft[],
  models: VehicleModel[]
): Promise<void> {
  const part = await getPartById(partId)
  if (!part) throw new Error('Part not found')

  const { fitted: fittedCards, notFitted: notFittedCards } = partitionIplModelCards(cards)
  await deactivateAllBomItemsForPart(partId)

  for (const card of fittedCards) {
    const vehicleModel = models.find(m => m.id === card.modelId)
    if (!vehicleModel) continue
    const stationCode = normalizeBomStationCodeText(
      card.station_code_text || master.common_station || part.common_station || ''
    )
    const bomId = await ensureBomLineForPart(part, card.modelName, vehicleModel.id, stationCode, {
      part_number: card.part_number.trim(),
      quantity: Number(card.qty)
    })
    const { error } = await client()
      .from('bom_items')
      .update({
        part_number: card.part_number.trim(),
        quantity: Number(card.qty),
        part_name: master.part_name_ar?.trim() || master.part_name_en?.trim() || null,
        vehicle_model_id: vehicleModel.id,
        station_code_text: stationCode || null,
        station_id: card.station_id || null,
        supply_source: effectiveSupplySource(card.supply_source),
        applicable_models_text: card.modelName,
        qty_by_model_raw: `${card.modelName}=${card.qty}`,
        needs_review: !stationCode,
        is_active: true
      })
      .eq('id', bomId)
    if (error) throw new Error(error.message)
    if (card.feeding && iplFeedingHasContent(card.feeding)) await updateBomIplFeedingCard([bomId], card.feeding)
  }

  for (const card of notFittedCards) {
    const vehicleModel = models.find(m => m.id === card.modelId)
    if (!vehicleModel) continue
    await ensureIplNotFittedLine(part, card.modelName, vehicleModel.id)
  }
}

/** Save parts-list master row + per-model part numbers (official source for IPL compare). */
export async function savePartMasterFromListForm(
  editId: string | null,
  master: PartMasterInput,
  cards: ModelCardDraft[],
  models: VehicleModel[]
): Promise<string> {
  const { fitted: fittedCards, notFitted: notFittedCards } = partitionIplModelCards(cards)

  let partId = editId
  const payload: PartMasterInput = {
    ...master,
    model_names: fittedCards.map(c => c.modelName)
  }

  if (partId) {
    await updatePartMaster(partId, payload)
  } else {
    const res = await createPartMaster(payload)
    partId = res.id
  }

  if (fittedCards.length > 0 || notFittedCards.length > 0) {
    await syncPartMasterModelCards(partId, master, cards, models)
  } else {
    await deactivateAllBomItemsForPart(partId)
  }

  return partId
}

export async function saveBomFromModelCards(
  editItemId: string | undefined,
  familyIds: string[],
  cards: ModelCardDraft[],
  names: {
    part_name_ar?: string
    part_name_en?: string
    notes?: string
    stopper_type?: 'line_stopper' | 'car_stopper' | 'non_stopper'
  },
  allModels: VehicleModel[],
  options?: { masterPartId?: string }
): Promise<string> {
  const masterPartId = options?.masterPartId?.trim() || undefined
  const active = cards.filter(c => {
    const q = Number(c.qty)
    return c.part_number.trim() && c.modelId && Number.isFinite(q) && q > 0
  })
  if (active.length === 0) throw new Error('At least one model with part number and qty is required')

  if (cardsCanConsolidate(active)) {
    const payload = consolidatedPayload(allModels, familyIds, active, names)
    if (editItemId) {
      await updateBomItem(editItemId, payload)
      return editItemId
    }
    const id = await createBomItem({
      ...payload,
      part_id: masterPartId,
      vehicle_model_id: active.length === 1 ? active[0].modelId : null
    })
    return id
  }

  let primaryId = editItemId ?? ''
  for (let i = 0; i < active.length; i++) {
    const c = active[i]
    const variant = allModels.find(m => m.id === c.modelId)
    const familyName =
      allModels.find(m => m.id === variant?.parent_model_id)?.name ??
      allModels.find(m => familyIds.includes(m.id))?.name ??
      undefined
    const payload: BomItemCreateInput = {
      part_id: masterPartId,
      part_number: c.part_number.trim(),
      part_number_new: c.part_number_new.trim() || undefined,
      alternative_part_no: c.alternative_part_no.trim() || undefined,
      part_name_ar: names.part_name_ar,
      part_name_en: names.part_name_en,
      part_kind: effectivePartKind(c.part_kind),
      quantity: Number(c.qty),
      vehicle_model_id: c.modelId,
      station_id: c.station_id || null,
      station_code_text: normalizeBomStationCodeText(c.station_code_text),
      station_category: c.station_category || undefined,
      supply_source: effectiveSupplySource(c.supply_source),
      model_family: familyName,
      applicable_models_text: c.modelName,
      bom_classification: c.bom_classification || undefined,
      qty_by_model_raw: `${c.modelName}=${c.qty}`,
      notes: names.notes,
      stopper_type: names.stopper_type ?? 'non_stopper'
    }
    if (i === 0 && editItemId) {
      await updateBomItem(editItemId, payload)
      primaryId = editItemId
    } else {
      const id = await createBomItem(payload)
      if (!primaryId) primaryId = id
    }
  }
  if (!primaryId) throw new Error('Failed to save BOM item')
  return primaryId
}
