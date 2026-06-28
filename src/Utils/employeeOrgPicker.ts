import type { FactoryOrgUnit, FactoryOrgUnitKind } from '../Types/factoryOrg'

function compareUnits(a: FactoryOrgUnit, b: FactoryOrgUnit): number {
  const sortDiff = a.sortOrder - b.sortOrder
  if (sortDiff !== 0) return sortDiff
  return a.name.localeCompare(b.name, 'ar')
}

export function orgChildren(
  parentId: string | null,
  units: FactoryOrgUnit[],
  includeIds: string[] = []
): FactoryOrgUnit[] {
  const include = new Set(includeIds.filter(Boolean))
  return units
    .filter(u => u.parentId === parentId && (u.isActive || include.has(u.id)))
    .sort(compareUnits)
}

export function orgPathFromLeaf(leafId: string | null | undefined, units: FactoryOrgUnit[]): string[] {
  if (!leafId) return []
  const byId = new Map(units.map(u => [u.id, u]))
  const path: string[] = []
  let cur = byId.get(leafId)
  while (cur) {
    path.unshift(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return path
}

export function orgPathLeaf(path: string[]): string | null {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i]) return path[i]
  }
  return null
}

export function orgPathLabel(pathIds: string[], units: FactoryOrgUnit[]): string | null {
  if (pathIds.length === 0) return null
  const byId = new Map(units.map(u => [u.id, u]))
  const names = pathIds.map(id => byId.get(id)?.name).filter((name): name is string => Boolean(name))
  return names.length > 0 ? names.join(' / ') : null
}

export function orgLevelLabel(
  parentId: string | null,
  units: FactoryOrgUnit[],
  t: (key: string) => string
): string {
  if (!parentId) return t('settings.administrations.kinds.administration')
  const parent = units.find(u => u.id === parentId)
  if (!parent) return ''
  if (parent.unitKind === 'administration') return t('settings.administrations.kinds.section')
  return t('settings.administrations.kinds.subsection')
}

export function orgLevelKind(parentId: string | null, units: FactoryOrgUnit[]): FactoryOrgUnitKind | null {
  if (!parentId) return 'administration'
  const parent = units.find(u => u.id === parentId)
  if (!parent) return null
  if (parent.unitKind === 'administration') return 'section'
  if (parent.unitKind === 'section' || parent.unitKind === 'subsection') return 'subsection'
  return null
}

export type OrgPickerLevel = {
  depth: number
  parentId: string | null
  selectedId: string
  options: FactoryOrgUnit[]
}

/** Build cascade levels until an unselected level or no children remain. */
export function buildOrgPickerLevels(path: string[], units: FactoryOrgUnit[]): OrgPickerLevel[] {
  const levels: OrgPickerLevel[] = []
  let parentId: string | null = null
  let depth = 0

  while (true) {
    const selectedId = path[depth] ?? ''
    const includeIds = path.slice(depth)
    const options = orgChildren(parentId, units, includeIds)
    if (options.length === 0) break
    levels.push({ depth, parentId, selectedId, options })
    if (!selectedId) break
    parentId = selectedId
    depth++
  }

  return levels
}

export function employeeMatchesOrgFilter(
  employeeOrgUnitId: string | null | undefined,
  filterUnitId: string,
  units: FactoryOrgUnit[]
): boolean {
  if (!filterUnitId) return true
  if (!employeeOrgUnitId) return false
  if (employeeOrgUnitId === filterUnitId) return true
  const path = orgPathFromLeaf(employeeOrgUnitId, units)
  return path.includes(filterUnitId)
}
