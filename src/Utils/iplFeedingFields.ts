import type { BomItemDetail } from '../Types/bom'
import { effectivePartKind } from './bomDefaults'
import { partKindLabel, resolveSupplySource, supplySourceLabel } from './bomDisplayFormat'

function normKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()]/g, '')
}

function pickRaw(raw: Record<string, string> | null | undefined, ...candidates: string[]): string {
  if (!raw) return ''
  const map = new Map<string, string>()
  for (const [k, v] of Object.entries(raw)) {
    const val = String(v ?? '').trim()
    if (val) map.set(normKey(k), val)
  }
  for (const c of candidates) {
    const v = map.get(normKey(c))
    if (v) return v
  }
  for (const c of candidates) {
    const n = normKey(c)
    for (const [k, v] of map) {
      if ((k.includes(n) || n.includes(k)) && v) return v
    }
  }
  return ''
}

export type PartDirectionKind = 'right' | 'left' | 'either' | 'other'

export function resolvePartDirection(
  side: string | null | undefined,
  position: string | null | undefined,
  raw?: Record<string, string> | null
): { kind: PartDirectionKind; raw: string } {
  const fromRaw = pickRaw(
    raw ?? undefined,
    'side',
    'direction',
    'اتجاه',
    'اتجاه_الجزء',
    'rl',
    'r/l',
    'lh_rh',
    'rh_lh'
  )
  const s = (fromRaw || side || position || '').trim()
  if (!s) return { kind: 'either', raw: '' }

  const u = s.toUpperCase()
  if (/^(R|RH|RIGHT|يمين)$/.test(u) || /\bRIGHT\b|\bRH\b|\bR\b/.test(u)) {
    return { kind: 'right', raw: s }
  }
  if (/^(L|LH|LEFT|شمال)$/.test(u) || /\bLEFT\b|\bLH\b|\bL\b/.test(u)) {
    return { kind: 'left', raw: s }
  }
  if (/^(N\/A|NA|NONE|—|-|BOTH|ANY|مش|لا|عام|U|UNIVERSAL)$/i.test(u)) {
    return { kind: 'either', raw: s }
  }
  return { kind: 'other', raw: s }
}

export function formatPartDimensions(raw?: Record<string, string> | null): string {
  const combined = pickRaw(
    raw ?? undefined,
    'dimensions',
    'dimension',
    'أبعاد',
    'ابعاد',
    'أبعاد_الجزء',
    'l*w*h',
    'l_x_w_x_h',
    'size'
  )
  if (combined) return combined

  const l = pickRaw(raw ?? undefined, 'length', 'طول', 'l', 'len')
  const w = pickRaw(raw ?? undefined, 'width', 'عرض', 'w')
  const h = pickRaw(raw ?? undefined, 'height', 'ارتفاع', 'h')
  if (l || w || h) return [l, w, h].filter(Boolean).join('*')
  return ''
}

export function formatPartWeight(raw?: Record<string, string> | null): string {
  return pickRaw(raw ?? undefined, 'weight', 'الوزن', 'وزن', 'weight_kg', 'wt', 'mass')
}

export function formatRackCapacity(raw?: Record<string, string> | null): string {
  return pickRaw(
    raw ?? undefined,
    'rack_capacity',
    'rack capacity',
    'rack',
    'سعة_الراك',
    'سعة الراك',
    'rack_qty',
    'qty_rack'
  )
}

export function formatCartonQty(raw?: Record<string, string> | null): string {
  return pickRaw(
    raw ?? undefined,
    'carton_qty',
    'carton quantity',
    'qty_carton',
    'qty per carton',
    'quantity_in_carton',
    'box_qty',
    'الكمية_في_الكرتونة',
    'الكمية في الكرتونة',
    'كمية_الكرتونة',
    'كمية الكرتونة'
  )
}

export function formatFeedingMethod(raw?: Record<string, string> | null): string {
  return pickRaw(
    raw ?? undefined,
    'feeding_method',
    'feeding method',
    'feed_method',
    'supply_method',
    'طريقة_التغذية',
    'طريقة التغذية',
    'أسلوب_التغذية',
    'أسلوب التغذية'
  )
}

export function iplFieldsFromBomItem(
  item: BomItemDetail,
  t: (k: string) => string
): {
  partDirection: PartDirectionKind
  partDirectionLabel: string
  partKindLabel: string
  dimensions: string
  weight: string
  classification: string
  rackCapacity: string
  supplierLabel: string
  cartonQty: string
  feedingMethod: string
  stationCode: string
} {
  const dir = resolvePartDirection(item.side, item.position, item.raw_data)
  let partDirectionLabel = ''
  if (dir.kind === 'right') partDirectionLabel = t('warehouses.feeding.direction.right')
  else if (dir.kind === 'left') partDirectionLabel = t('warehouses.feeding.direction.left')
  else if (dir.kind === 'either') partDirectionLabel = t('warehouses.feeding.direction.either')
  else partDirectionLabel = dir.raw || '—'

  const dimensions = formatPartDimensions(item.raw_data)
  const weight = formatPartWeight(item.raw_data)
  const rackCapacity = formatRackCapacity(item.raw_data)
  const cartonQty = formatCartonQty(item.raw_data)
  const feedingMethod = formatFeedingMethod(item.raw_data)
  const supplier = resolveSupplySource(item)
  const supplierLabel = supplier ? supplySourceLabel(supplier, t) : ''

  return {
    partDirection: dir.kind,
    partDirectionLabel,
    partKindLabel: partKindLabel(effectivePartKind(item.part_type), t),
    dimensions: dimensions || '—',
    weight: weight || '—',
    classification: item.bom_classification?.trim() || item.station_category?.trim() || '—',
    rackCapacity: rackCapacity || '—',
    supplierLabel: supplierLabel || '—',
    cartonQty: cartonQty || '—',
    feedingMethod: feedingMethod || '—',
    stationCode: item.station_code_text || item.station_number || '—'
  }
}
