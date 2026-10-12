import type { FactoryOrgUnit } from '../Types/factoryOrg'

/** يوحّد اختلافات الألف والياء عشان «البودى» و«البودي» يبقوا نفس الاسم. */
export function foldWorkplaceName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/^(اداره|ادارة|قسم فرعي|قسم)\s+/u, '')
    .replace(/^ال(?=\S)/u, '')
    .toLowerCase()
}

const BODY_NAMES = new Set(['بودي'])

function isBodyUnitName(name: string): boolean {
  return BODY_NAMES.has(foldWorkplaceName(name))
}

function unitParent(unit: FactoryOrgUnit, byId: Map<string, FactoryOrgUnit>): FactoryOrgUnit | null {
  return unit.parentId ? (byId.get(unit.parentId) ?? null) : null
}

function isUnderBody(unit: FactoryOrgUnit, byId: Map<string, FactoryOrgUnit>): boolean {
  let current: FactoryOrgUnit | null = unit
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    if (isBodyUnitName(current.name)) return true
    seen.add(current.id)
    current = unitParent(current, byId)
  }
  return false
}

function pickOrgUnit(matches: FactoryOrgUnit[], byId: Map<string, FactoryOrgUnit>): string | null {
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0].id
  const underBody = matches.filter(unit => isUnderBody(unit, byId))
  if (underBody.length === 1) return underBody[0].id
  const pool = underBody.length > 0 ? underBody : matches
  const directChild = pool.find(unit => {
    const parent = unitParent(unit, byId)
    return parent != null && isBodyUnitName(parent.name)
  })
  return directChild?.id ?? pool[0]?.id ?? null
}

/** اسم مكان العمل من الشيت يطابق قسم في الهيكل، أو مسار مثل «البودي / اللحام». */
export function resolveFactoryOrgUnitId(raw: string, units: FactoryOrgUnit[]): string | null {
  const active = units.filter(unit => unit.isActive)
  const pool = active.length > 0 ? active : units
  const byId = new Map(pool.map(unit => [unit.id, unit]))
  const segments = raw
    .split(/\s*[>/|\\»\-–—]+\s*/u)
    .map(part => part.trim())
    .filter(Boolean)

  if (segments.length > 1) {
    const leafKey = foldWorkplaceName(segments[segments.length - 1])
    const parentKey = foldWorkplaceName(segments[segments.length - 2])
    const pathMatches = pool.filter(unit => {
      if (foldWorkplaceName(unit.name) !== leafKey) return false
      const parent = unitParent(unit, byId)
      return parent != null && foldWorkplaceName(parent.name) === parentKey
    })
    const picked = pickOrgUnit(pathMatches, byId)
    if (picked) return picked
  }

  const key = foldWorkplaceName(raw)
  if (!key) return null
  return pickOrgUnit(
    pool.filter(unit => foldWorkplaceName(unit.name) === key),
    byId
  )
}
