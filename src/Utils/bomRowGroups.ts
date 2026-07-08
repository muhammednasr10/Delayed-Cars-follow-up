import type { BomItemDetail } from '../Types/bom'
import { formatClassByPartNumberGroups, resolveSupplySource } from './bomDisplayFormat'
import { effectivePartKind, effectiveSupplySource } from './bomDefaults'
import { maxModelQty, modelQtyFromBomRow } from './bomQtyByModel'
import { normalizeArabicPartNameForGrouping, normalizeEnglishPartNameForGrouping } from './bomPartNameNormalize'

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
  const ar = normalizeArabicPartNameForGrouping(row.part_name_ar ?? row.part_name ?? '')
  if (ar) return `ar:${ar}`

  const en = normalizeEnglishPartNameForGrouping(row.part_name_en ?? '')
  if (en) return `en:${en}`

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

function variantMergeKey(v: BomVariantLine): string {
  return `${v.modelName.trim()}|${v.part_number.trim().toUpperCase()}`
}

function variantsFromRows(rows: BomItemDetail[]): BomVariantLine[] {
  const map = new Map<string, BomVariantLine>()
  for (const row of rows) {
    for (const v of variantsFromSingleRow(row)) {
      if (!v.modelName.trim()) continue
      const k = variantMergeKey(v)
      const prev = map.get(k)
      if (!prev || v.qty > prev.qty) map.set(k, v)
    }
  }
  return [...map.values()].sort((a, b) => a.modelName.localeCompare(b.modelName, 'ar'))
}

function pickPrimary(rows: BomItemDetail[]): BomItemDetail {
  return (
    rows.find(r => r.qty_by_model_raw?.includes(';')) ??
    rows.find(r => parseApplicableModelNames(r.applicable_models_text).length > 1) ??
    rows.reduce((best, row) => {
      const arLen = (row.part_name_ar ?? row.part_name ?? '').trim().length
      const bestLen = (best.part_name_ar ?? best.part_name ?? '').trim().length
      return arLen > bestLen ? row : best
    }, rows[0])
  )
}

function pickBestPartName(rows: BomItemDetail[], kind: 'ar' | 'en'): string {
  const values = rows
    .map(row => {
      if (kind === 'ar') return (row.part_name_ar ?? row.part_name ?? '').trim()
      return (row.part_name_en ?? '').trim()
    })
    .filter(Boolean)
  if (values.length === 0) return ''
  return [...values].sort((a, b) => b.length - a.length)[0]
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

function buildSummary(
  primary: BomItemDetail,
  variants: BomVariantLine[],
  classByPartNumber: string,
  rows: BomItemDetail[]
): BomItemDetail {
  const models = [...new Set(variants.map(v => v.modelName).filter(Boolean))]
  const qtyRaw = variants
    .filter(v => v.modelName)
    .map(v => `${v.modelName}=${v.qty}`)
    .join('; ')
  const entries = variants.filter(v => v.modelName).map(v => ({ modelName: v.modelName, qty: v.qty }))
  const bestAr = pickBestPartName(rows, 'ar')
  const bestEn = pickBestPartName(rows, 'en')

  return {
    ...primary,
    part_name_ar: bestAr || primary.part_name_ar || primary.part_name,
    part_name: bestAr || primary.part_name_ar || primary.part_name,
    part_name_en: bestEn || primary.part_name_en,
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
  const activeVariants = variants.filter(v => v.qty > 0)
  const classByPartNumber = formatClassByPartNumberGroups(activeVariants.length > 0 ? activeVariants : variants)
  const summary = buildSummary(primary, variants, classByPartNumber, rows)
  return {
    key,
    primary,
    summary,
    variants,
    classByPartNumber,
    allIds: rows.map(r => r.id),
    expandable: variants.length > 1 || rows.length > 1
  }
}

/** Group BOM rows that share the same (normalized) Arabic part name. */
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

/** صف واحد لكل سطر BOM — لعرض IPL حسب موديل واحد */
export function bomItemsAsFlatGroups(items: BomItemDetail[]): BomDisplayGroup[] {
  return items.map(row => buildGroup(row.id, [row]))
}
