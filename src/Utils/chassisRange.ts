/** Count vehicles in an inclusive chassis/VIN numeric suffix range. */
export function chassisRangeCount(start: string, end: string): number | null {
  const s = start.trim()
  const e = end.trim()
  if (!s || !e) return null

  const sMatch = s.match(/(\d+)$/)
  const eMatch = e.match(/(\d+)$/)
  if (!sMatch || !eMatch) return null

  const sPrefix = s.slice(0, s.length - sMatch[1].length)
  const ePrefix = e.slice(0, e.length - eMatch[1].length)
  if (sPrefix !== ePrefix) return null

  const sNum = BigInt(sMatch[1])
  const eNum = BigInt(eMatch[1])
  if (eNum < sNum) return null

  const diff = eNum - sNum + 1n
  if (diff < 1n || diff > 10_000n) return null
  return Number(diff)
}

type ChassisRangeParts = { prefix: string; num: bigint }

function parseChassisRangePart(value: string): ChassisRangeParts | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = trimmed.match(/(\d+)$/)
  if (!match) return null
  return {
    prefix: trimmed.slice(0, trimmed.length - match[1].length),
    num: BigInt(match[1])
  }
}

/** True when a VIN/chassis falls inside an inclusive production-order range. */
export function vinInChassisRange(vin: string, start: string, end: string): boolean {
  const vinPart = parseChassisRangePart(vin)
  const startPart = parseChassisRangePart(start)
  const endPart = parseChassisRangePart(end)
  if (!vinPart || !startPart || !endPart) return false
  if (startPart.prefix !== endPart.prefix) return false
  if (startPart.prefix && vinPart.prefix !== startPart.prefix) return false
  return vinPart.num >= startPart.num && vinPart.num <= endPart.num
}
