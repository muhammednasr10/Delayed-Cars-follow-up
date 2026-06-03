const HIDDEN = /[\u200B-\u200D\uFEFF\u00A0]/g

/** Normalize for comparison — original part_number is stored separately. */
export function normalizePartNumber(raw: string, options?: { ignoreDashes?: boolean }): string {
  const ignoreDashes = options?.ignoreDashes !== false
  let s = String(raw ?? '')
    .replace(HIDDEN, '')
    .trim()
    .toUpperCase()
  s = s.replace(/\s+/g, '')
  if (ignoreDashes) s = s.replace(/[-–—]/g, '')
  return s
}

export function normalizeStationCode(raw: string): string {
  let s = String(raw ?? '')
    .replace(HIDDEN, '')
    .trim()
    .toUpperCase()
  if (/^\d+\.0$/.test(s)) s = String(parseInt(s, 10))
  return s
}

/** Stable upsert key: one BOM line per part + station + vehicle model. */
export function bomImportLineKey(parts: {
  normalizedPart: string
  stationCode: string
  modelName: string
}): string {
  return [
    parts.normalizedPart,
    normalizeStationCode(parts.stationCode) || '_',
    parts.modelName.trim().toUpperCase() || '_'
  ].join('|')
}

export function resolveVehicleModelId(name: string, modelMap: Map<string, string>): string | null {
  const raw = name.trim()
  if (!raw) return null
  const u = raw.toUpperCase()
  if (modelMap.has(u)) return modelMap.get(u) ?? null
  for (const [key, id] of modelMap) {
    if (key === u) return id
  }
  for (const [key, id] of modelMap) {
    if (key.includes(u) || u.includes(key)) return id
  }
  return null
}

export function parseQtyByModel(raw: string): { model: string; qty: number }[] {
  const s = String(raw ?? '').trim()
  if (!s) return [{ model: '', qty: 1 }]
  const out: { model: string; qty: number }[] = []
  for (const chunk of s.split(/[;；]/)) {
    const part = chunk.trim()
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq > 0) {
      const model = part.slice(0, eq).trim()
      const qty = Number(part.slice(eq + 1).trim())
      out.push({ model, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 })
    } else if (/^\d+(\.\d+)?$/.test(part)) {
      out.push({ model: '', qty: Number(part) })
    } else {
      out.push({ model: part, qty: 1 })
    }
  }
  return out.length ? out : [{ model: '', qty: 1 }]
}

export function classificationToCategoryCode(classification: string): string {
  const c = classification.trim().toLowerCase()
  if (!c) return 'UNCATEGORIZED'
  if (c.includes('common within')) return 'COMMON_IN_FAMILY'
  if (c.includes('shared across')) return 'SHARED_CROSS_FAMILY'
  if (c.includes('variant')) return 'VARIANT_SPECIFIC'
  if (c.includes('hardware') || c.includes('fastener')) return 'HARDWARE_FASTENER'
  if (c.includes('needs review') || c.includes('review')) return 'NEEDS_REVIEW'
  return 'UNCATEGORIZED'
}

export function excelComparisonStatusToDb(status: string): string {
  const s = status.trim().toLowerCase()
  if (s.includes('repeated') || s.includes('compare')) return 'duplicate'
  if (s.includes('unique')) return 'unique'
  if (s.includes('possible')) return 'possible_duplicate'
  return 'needs_review'
}
