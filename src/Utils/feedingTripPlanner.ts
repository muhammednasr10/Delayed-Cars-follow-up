import type { WarehouseCart } from '../Types/warehouse'

export type FeedingTripPlanRow = {
  partId: string
  partNumber: string
  partName: string
  quantity: string
  qtyPerVehicle: number
  weight: string
  dimensions: string
  stationCode: string | null
  included: boolean
}

export type PartDimsCm = { l: number; w: number; h: number }

export type FeedingTripPart = {
  partId: string
  partNumber: string
  partName: string
  quantity: number
  unitWeightKg: number
  tripWeightKg: number
  dimensionsCm: PartDimsCm | null
  fitsDoll: boolean
  stationCode: string | null
}

export type FeedingPlannedTrip = {
  tripIndex: number
  cartId: string
  cartCode: string
  parts: FeedingTripPart[]
  totalWeightKg: number
  maxLoadKg: number
  dollSlotsUsed: number
  dollCount: number
  warnings: string[]
}

export type FeedingTripPlanResult = {
  trips: FeedingPlannedTrip[]
  unassigned: Array<FeedingTripPart & { reasonKey: string }>
  warnings: string[]
}

export const DEFAULT_CART_MAX_LOAD_KG = 500
export const DEFAULT_CART_DOLL_COUNT = 12
export const DEFAULT_DOLL_LENGTH_CM = 100
export const DEFAULT_DOLL_WIDTH_CM = 80
export const DEFAULT_DOLL_HEIGHT_CM = 120

export function parseDimensionsCm(raw: string): PartDimsCm | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const nums = s
    .split(/[*x×X/\\\-,\s]+/)
    .map(n => parseFloat(n.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
  if (nums.length < 3) return null
  return { l: nums[0], w: nums[1], h: nums[2] }
}

export function cartDollDims(cart: WarehouseCart): PartDimsCm {
  return {
    l: cart.dollLengthCm ?? DEFAULT_DOLL_LENGTH_CM,
    w: cart.dollWidthCm ?? DEFAULT_DOLL_WIDTH_CM,
    h: cart.dollHeightCm ?? DEFAULT_DOLL_HEIGHT_CM
  }
}

export function cartMaxLoadKg(cart: WarehouseCart): number {
  const v = cart.maxLoadKg
  return v != null && Number.isFinite(v) && v > 0 ? v : DEFAULT_CART_MAX_LOAD_KG
}

export function cartDollCount(cart: WarehouseCart): number {
  const v = cart.dollCount
  return v != null && Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_CART_DOLL_COUNT
}

/** Part fits doll slot with rotation allowed on all axes. */
export function partFitsDoll(part: PartDimsCm | null, doll: PartDimsCm): boolean {
  if (!part) return true
  const p = [part.l, part.w, part.h].sort((a, b) => a - b)
  const d = [doll.l, doll.w, doll.h].sort((a, b) => a - b)
  return p[0] <= d[0] && p[1] <= d[1] && p[2] <= d[2]
}

function rowToTripPart(row: FeedingTripPlanRow, doll: PartDimsCm): FeedingTripPart {
  const quantity = Math.max(0.001, Number(row.quantity) || row.qtyPerVehicle || 1)
  const unitWeightKg = Math.max(0, Number(row.weight) || 0)
  const dimensionsCm = parseDimensionsCm(row.dimensions)
  return {
    partId: row.partId,
    partNumber: row.partNumber,
    partName: row.partName,
    quantity,
    unitWeightKg,
    tripWeightKg: round2(unitWeightKg * quantity),
    dimensionsCm,
    fitsDoll: partFitsDoll(dimensionsCm, doll),
    stationCode: row.stationCode
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type TripAcc = {
  tripIndex: number
  parts: FeedingTripPart[]
  totalWeightKg: number
  warnings: string[]
}

function canAdd(acc: TripAcc, part: FeedingTripPart, maxLoad: number, maxSlots: number, doll: PartDimsCm): string | null {
  if (part.tripWeightKg > maxLoad) return 'overMaxLoad'
  if (acc.totalWeightKg + part.tripWeightKg > maxLoad) return 'tripWeight'
  if (acc.parts.length >= maxSlots) return 'tripSlots'
  if (part.dimensionsCm && !partFitsDoll(part.dimensionsCm, doll)) return 'tripDims'
  return null
}

/**
 * Greedy trip builder: groups included IPL plan parts into cart trips
 * respecting max load, doll count, and doll slot dimensions.
 */
export function planFeedingTrips(rows: FeedingTripPlanRow[], cart: WarehouseCart | null): FeedingTripPlanResult {
  if (!cart) {
    return { trips: [], unassigned: [], warnings: ['noCart'] }
  }

  const included = rows.filter(r => r.included)
  if (included.length === 0) {
    return { trips: [], unassigned: [], warnings: ['noParts'] }
  }

  const doll = cartDollDims(cart)
  const maxLoad = cartMaxLoadKg(cart)
  const maxSlots = cartDollCount(cart)
  const parts = included.map(r => rowToTripPart(r, doll))

  const trips: FeedingPlannedTrip[] = []
  const unassigned: Array<FeedingTripPart & { reasonKey: string }> = []
  const globalWarnings: string[] = []

  let acc: TripAcc = { tripIndex: 1, parts: [], totalWeightKg: 0, warnings: [] }

  for (const part of parts) {
    if (part.tripWeightKg > maxLoad) {
      unassigned.push({ ...part, reasonKey: 'overMaxLoad' })
      continue
    }
    if (part.dimensionsCm && !partFitsDoll(part.dimensionsCm, doll)) {
      unassigned.push({ ...part, reasonKey: 'dims' })
      continue
    }

    const block = canAdd(acc, part, maxLoad, maxSlots, doll)
    if (block) {
      if (acc.parts.length > 0) {
        trips.push(finishTrip(acc, cart, maxLoad, maxSlots))
        acc = { tripIndex: trips.length + 1, parts: [], totalWeightKg: 0, warnings: [] }
      }
      const soloBlock = canAdd(acc, part, maxLoad, maxSlots, doll)
      if (soloBlock) {
        unassigned.push({ ...part, reasonKey: soloBlock })
        continue
      }
    }

    acc.parts.push(part)
    acc.totalWeightKg = round2(acc.totalWeightKg + part.tripWeightKg)
    if (!part.fitsDoll && part.dimensionsCm) acc.warnings.push('dimsUnknown')
  }

  if (acc.parts.length > 0) {
    trips.push(finishTrip(acc, cart, maxLoad, maxSlots))
  }

  if (unassigned.length > 0) globalWarnings.push('hasUnassigned')

  return { trips, unassigned, warnings: globalWarnings }
}

function finishTrip(acc: TripAcc, cart: WarehouseCart, maxLoad: number, maxSlots: number): FeedingPlannedTrip {
  return {
    tripIndex: acc.tripIndex,
    cartId: cart.id,
    cartCode: cart.code,
    parts: acc.parts,
    totalWeightKg: acc.totalWeightKg,
    maxLoadKg: maxLoad,
    dollSlotsUsed: acc.parts.length,
    dollCount: maxSlots,
    warnings: acc.warnings
  }
}

export function loadPercent(trip: FeedingPlannedTrip): number {
  if (trip.maxLoadKg <= 0) return 0
  return Math.min(100, round2((trip.totalWeightKg / trip.maxLoadKg) * 100))
}
