import type { BomItemDetail } from '../Types/bom'
import type { VehicleModel } from '../Types/settings'
import { buildModelFamilyGroups, isAssignableModel } from './vehicleModelHierarchy'

export type BomIplLogistics = {
  part_length: string
  part_width: string
  part_height: string
  part_volume: string
  feeding_method: string
  packing: string
  part_direction: string
  carton_qty: string
  part_weight: string
  carton_weight: string
  rack_code: string
  rack_length: string
  rack_width: string
  rack_height: string
  rack_size: string
}

export const PACKING_TYPES = ['carton', 'bin', 'bag', 'part'] as const
export type PackingType = (typeof PACKING_TYPES)[number]

export const DEFAULT_RACK_LENGTH_CM = '220'
export const DEFAULT_RACK_WIDTH_CM = '120'
export const DEFAULT_RACK_HEIGHT_CM = '180'

export function volumeM3FromCm(lengthCm: string, widthCm: string, heightCm: string): string {
  const l = parseFloat(lengthCm)
  const w = parseFloat(widthCm)
  const h = parseFloat(heightCm)
  if (![l, w, h].every(n => Number.isFinite(n) && n > 0)) return ''
  const m3 = (l / 100) * (w / 100) * (h / 100)
  if (m3 < 0.0001) return m3.toPrecision(3)
  const fixed = m3.toFixed(4)
  return fixed.replace(/\.?0+$/, '') || '0'
}

export function normalizePartDirection(value: string | null | undefined): string {
  const s = String(value ?? '').trim()
  if (!s) return ''
  const u = s.toUpperCase()
  if (u === 'ي' || u === 'Y' || u === 'R' || u === 'RH' || u === 'RIGHT' || s === 'يمين') return 'ي'
  if (u === 'ش' || u === 'SH' || u === 'L' || u === 'LH' || u === 'LEFT' || s === 'شمال') return 'ش'
  return s
}

export function normalizePackingType(value: string | null | undefined): PackingType | '' {
  const s = String(value ?? '').trim().toLowerCase()
  if (!s) return ''
  if (s === 'carton' || s.includes('كرتون')) return 'carton'
  if (s === 'bin' || s.includes('برنيك')) return 'bin'
  if (s === 'bag' || s.includes('كيس')) return 'bag'
  if (s === 'part' || s.includes('جزء')) return 'part'
  return ''
}

export function withComputedVolumes(logistics: BomIplLogistics): BomIplLogistics {
  return {
    ...logistics,
    part_volume: volumeM3FromCm(logistics.part_length, logistics.part_width, logistics.part_height),
    rack_size: volumeM3FromCm(logistics.rack_length, logistics.rack_width, logistics.rack_height)
  }
}

export type BomIplFeedingCard = BomIplLogistics & {
  stopper_type: 'line_stopper' | 'car_stopper' | 'non_stopper'
}

export function iplFeedingCardFromBomItem(
  item: Pick<BomItemDetail, keyof BomIplLogistics | 'side' | 'position' | 'stopper_type'>
): BomIplFeedingCard {
  const logistics = iplLogisticsFromBomItem(item)
  const stopper = item.stopper_type
  const stopper_type =
    stopper === 'line_stopper' || stopper === 'car_stopper' ? stopper : 'non_stopper'
  return { ...logistics, stopper_type }
}

export type BomIplLogisticsInput = {
  [K in keyof BomIplLogistics]?: string | null
}

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

export function extractIplLogisticsFromRaw(raw?: Record<string, string> | null): BomIplLogisticsInput {
  if (!raw) return {}
  const out: BomIplLogisticsInput = {}
  const part_length = pickRaw(raw, 'length', 'طول', 'part_length', 'طول_الجزء', 'l', 'len')
  const part_width = pickRaw(raw, 'width', 'عرض', 'part_width', 'عرض_الجزء', 'w')
  const part_height = pickRaw(raw, 'height', 'ارتفاع', 'part_height', 'ارتفاع_الجزء', 'h')
  const part_volume = pickRaw(raw, 'volume', 'حجم', 'حجم_الجزء', 'size', 'dimensions', 'أبعاد', 'ابعاد')
  const feeding_method = pickRaw(raw, 'feeding_method', 'feeding method', 'طريقة_التغذية', 'طريقة التغذية')
  const packing = pickRaw(raw, 'packing', 'packaging', 'باكينج', 'التعبئة')
  const part_direction = pickRaw(raw, 'direction', 'side', 'اتجاه', 'اتجاه_الجزء', 'rl', 'r/l', 'rh_lh')
  const rack_code = pickRaw(raw, 'rack', 'rack_code', 'الراك', 'راك', 'rack_used')
  const carton_qty = pickRaw(
    raw,
    'carton_qty',
    'carton quantity',
    'qty_carton',
    'qty per carton',
    'quantity_in_carton',
    'box_qty',
    'الكمية_في_الكرتونة',
    'الكمية في الكرتونة',
    'كمية_الكرتونة'
  )
  const part_weight = pickRaw(
    raw,
    'part_weight',
    'weight',
    'الوزن',
    'وزن',
    'وزن_الجزء',
    'weight_kg',
    'wt',
    'mass'
  )
  const carton_weight = pickRaw(
    raw,
    'carton_weight',
    'box_weight',
    'وزن_الكرتونة',
    'وزن الكرتونة'
  )
  const rack_size = pickRaw(
    raw,
    'rack_size',
    'rack capacity',
    'rack_capacity',
    'حجم_الراك',
    'حجم الراك',
    'سعة_الراك',
    'rack_qty'
  )

  if (part_length) out.part_length = part_length
  if (part_width) out.part_width = part_width
  if (part_height) out.part_height = part_height
  if (part_volume) out.part_volume = part_volume
  if (feeding_method) out.feeding_method = feeding_method
  if (packing) out.packing = packing
  if (part_direction) out.part_direction = part_direction
  if (carton_qty) out.carton_qty = carton_qty
  if (part_weight) out.part_weight = part_weight
  if (carton_weight) out.carton_weight = carton_weight
  if (rack_code) out.rack_code = rack_code
  if (rack_size) out.rack_size = rack_size
  return out
}

export function iplLogisticsFromBomItem(
  item: Pick<
    BomItemDetail,
    | keyof BomIplLogistics
    | 'side'
    | 'position'
    | 'rack_length'
    | 'rack_width'
    | 'rack_height'
    | 'carton_qty'
    | 'part_weight'
    | 'carton_weight'
  >
): BomIplLogistics {
  const rack_length = item.rack_length?.trim() || DEFAULT_RACK_LENGTH_CM
  const rack_width = item.rack_width?.trim() || DEFAULT_RACK_WIDTH_CM
  const rack_height = item.rack_height?.trim() || DEFAULT_RACK_HEIGHT_CM
  const base: BomIplLogistics = {
    part_length: item.part_length?.trim() || '',
    part_width: item.part_width?.trim() || '',
    part_height: item.part_height?.trim() || '',
    part_volume: item.part_volume?.trim() || '',
    feeding_method: item.feeding_method?.trim() || '',
    packing: normalizePackingType(item.packing) || item.packing?.trim() || '',
    part_direction: normalizePartDirection(item.part_direction || item.side || item.position),
    carton_qty: item.carton_qty?.trim() || '',
    part_weight: item.part_weight?.trim() || '',
    carton_weight: item.carton_weight?.trim() || '',
    rack_code: item.rack_code?.trim() || '',
    rack_length,
    rack_width,
    rack_height,
    rack_size: item.rack_size?.trim() || ''
  }
  return withComputedVolumes(base)
}

export function formatPartDimensionsFromFields(logistics: BomIplLogistics): string {
  const combined = logistics.part_volume.trim()
  if (combined) return combined
  const parts = [logistics.part_length, logistics.part_width, logistics.part_height].filter(Boolean)
  return parts.length > 0 ? parts.join('*') : ''
}

export const BOM_IPL_LOGISTICS_FIELDS = [
  'part_direction',
  'packing',
  'carton_qty',
  'part_weight',
  'carton_weight',
  'part_length',
  'part_width',
  'part_height',
  'part_volume',
  'feeding_method',
  'rack_code',
  'rack_length',
  'rack_width',
  'rack_height',
  'rack_size'
] as const

export type BomIplLogisticsField = (typeof BOM_IPL_LOGISTICS_FIELDS)[number]

export function buildFeedingModelOptionGroups(
  models: VehicleModel[],
  labels: { other: string; flat: string }
): { label: string; models: VehicleModel[] }[] {
  const picker = buildModelFamilyGroups(models.filter(m => m.is_active))
  const groups: { label: string; models: VehicleModel[] }[] = []

  for (const g of picker.groups) {
    const variants = g.variants.filter(isAssignableModel).sort((a, b) => a.name.localeCompare(b.name))
    if (variants.length > 0) groups.push({ label: g.family.name, models: variants })
  }

  const orphans = picker.orphanVariants.filter(isAssignableModel).sort((a, b) => a.name.localeCompare(b.name))
  if (orphans.length > 0) groups.push({ label: labels.other, models: orphans })

  if (groups.length === 0) {
    const flat = [
      ...picker.orphanVariants.filter(isAssignableModel),
      ...models.filter(m => m.model_kind !== 'family' && m.is_active && !m.parent_model_id)
    ]
      .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (flat.length > 0) groups.push({ label: labels.flat, models: flat })
  }

  return groups
}

export function firstAssignableModelId(models: VehicleModel[]): string {
  const groups = buildFeedingModelOptionGroups(models, { other: '', flat: '' })
  for (const g of groups) {
    const first = g.models[0]
    if (first) return first.id
  }
  return ''
}
