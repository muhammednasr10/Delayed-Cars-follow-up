import type { BomItemDetail } from '../Types/bom'
import { formatClassByPartNumberGroups, classLabelForVariant, resolveSupplySource } from './bomDisplayFormat'
import { effectivePartKind, effectiveSupplySource } from './bomDefaults'
import { maxModelQty, modelQtyFromBomRow } from './bomQtyByModel'

export type BomVariantLine = {
  id: string
  modelName: string
  part_number: string
  qty: number
  station_code: string
  classification: string
  part_kind: string
  supply_source: string
}

export type BomDisplayGroup = {
  key: string
  primary: BomItemDetail
  summary: BomItemDetail
  variants: BomVariantLine[]
  classByPartNumber: string
  allIds: string[]
  expandable: boolean
}

function bomDisplayGroupKey(row: BomItemDetail): string {
  const ar = (row.part_name_ar ?? row.part_name ?? '').trim().toLowerCase()
  const en = (row.part_name_en ?? '').trim().toLowerCase()
  if (ar || en) return `n:${ar}|${en}`
  return `p:${row.normalized_part_number || row.part_number.trim().toUpperCase()}`
}

function variantFromRow(row: BomItemDetail, modelName: string, qty: number): BomVariantLine {
  return {
    id: row.id,
    modelName,
    part_number: row.part_number,
    qty,
    station_code: row.station_code_text || row.station_number || '',
    classification: '',
    part_kind: effectivePartKind(row.part_type),
    supply_source: effectiveSupplySource(resolveSupplySource(row))
  }
}

function variantsFromSingleRow(row: BomItemDetail): BomVariantLine[] {
  const entries = modelQtyFromBomRow(row)
  if (entries.length > 0) {
    return entries.map(e => variantFromRow(row, e.modelName, e.qty))
  }
  return [
    variantFromRow(row, row.vehicle_model_name || row.applicable_models_text || '', row.quantity ?? 1)
  ]
}

function variantsFromRows(rows: BomItemDetail[]): BomVariantLine[] {
  const out: BomVariantLine[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const v of variantsFromSingleRow(row)) {
      const k = `${v.modelName}|${v.id}`
      if (v.modelName && seen.has(k)) continue
      if (v.modelName) seen.add(k)
      out.push(v)
    }
  }
  return out.sort((a, b) => a.modelName.localeCompare(b.modelName))
}

function pickPrimary(rows: BomItemDetail[]): BomItemDetail {
  return (
    rows.find(r => r.qty_by_model_raw?.includes(';')) ??
    rows.find(r => parseApplicableModelNames(r.applicable_models_text).length > 1) ??
    rows[0]
  )
}

function parseApplicableModelNames(text: string | null | undefined): string[] {
  return String(text ?? '')
    .split(/[,،]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function allSame(values: string[]): boolean {
  const trimmed = values.map(v => v.trim()).filter(Boolean)
  if (trimmed.length <= 1) return true
  return trimmed.every(v => v === trimmed[0])
}

function buildSummary(primary: BomItemDetail, variants: BomVariantLine[], classByPartNumber: string): BomItemDetail {
  const models = [...new Set(variants.map(v => v.modelName).filter(Boolean))]
  const qtyRaw = variants
    .filter(v => v.modelName)
    .map(v => `${v.modelName}=${v.qty}`)
    .join('; ')
  const entries = variants.filter(v => v.modelName).map(v => ({ modelName: v.modelName, qty: v.qty }))

  return {
    ...primary,
    part_number: allSame(variants.map(v => v.part_number)) ? variants[0]?.part_number ?? primary.part_number : primary.part_number,
    applicable_models_text: models.join(', '),
    vehicle_model_name: null,
    qty_by_model_raw: qtyRaw || primary.qty_by_model_raw,
    quantity: entries.length ? maxModelQty(entries) : primary.quantity,
    station_code_text: allSame(variants.map(v => v.station_code))
      ? variants[0]?.station_code || primary.station_code_text
      : null,
    bom_classification: classByPartNumber || primary.bom_classification,
    part_type: allSame(variants.map(v => v.part_kind))
      ? effectivePartKind(variants[0]?.part_kind || primary.part_type)
      : null,
    supply_source: allSame(variants.map(v => v.supply_source))
      ? effectiveSupplySource(variants[0]?.supply_source || primary.supply_source)
      : null
  }
}

function buildGroup(key: string, rows: BomItemDetail[]): BomDisplayGroup {
  const primary = pickPrimary(rows)
  const variants = rows.length === 1 ? variantsFromSingleRow(rows[0]) : variantsFromRows(rows)
  const classByPartNumber = formatClassByPartNumberGroups(variants.filter(v => v.qty > 0))
  const summary = buildSummary(primary, variants, classByPartNumber)
  return {
    key,
    primary,
    summary,
    variants,
    classByPartNumber,
    allIds: rows.map(r => r.id),
    expandable: variants.length > 1
  }
}

/** Group paginated BOM rows that share the same part identity (name / number). */
export function groupBomItemsForDisplay(items: BomItemDetail[]): BomDisplayGroup[] {
  const order: string[] = []
  const buckets = new Map<string, BomItemDetail[]>()

  for (const item of items) {
    const key = bomDisplayGroupKey(item)
    if (!buckets.has(key)) {
      buckets.set(key, [])
      order.push(key)
    }
    buckets.get(key)!.push(item)
  }

  return order.map(key => buildGroup(key, buckets.get(key)!))
}
