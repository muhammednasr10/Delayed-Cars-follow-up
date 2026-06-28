import type { FactoryOrgUnit, FactoryOrgUnitKind, FactoryOrgUnitNode } from '../Types/factoryOrg'

function compareUnits(a: FactoryOrgUnit, b: FactoryOrgUnit): number {
  const sortDiff = a.sortOrder - b.sortOrder
  if (sortDiff !== 0) return sortDiff
  return a.name.localeCompare(b.name, 'ar')
}

export function buildFactoryOrgTree(units: FactoryOrgUnit[]): FactoryOrgUnitNode[] {
  const byParent = new Map<string | null, FactoryOrgUnit[]>()
  for (const unit of units) {
    const key = unit.parentId
    const list = byParent.get(key) ?? []
    list.push(unit)
    byParent.set(key, list)
  }

  function build(parentId: string | null): FactoryOrgUnitNode[] {
    const children = (byParent.get(parentId) ?? []).sort(compareUnits)
    return children.map(unit => ({
      unit,
      children: build(unit.id)
    }))
  }

  return build(null)
}

export function factoryOrgUnitKindLabel(
  kind: FactoryOrgUnitKind,
  t: (key: string) => string
): string {
  return t(`settings.administrations.kinds.${kind}`)
}

export function allowedChildKind(parent: FactoryOrgUnit | null): FactoryOrgUnitKind | null {
  if (!parent) return 'administration'
  if (parent.unitKind === 'administration') return 'section'
  if (parent.unitKind === 'section' || parent.unitKind === 'subsection') return 'subsection'
  return null
}

export function validateFactoryOrgParent(
  unitKind: FactoryOrgUnitKind,
  parent: FactoryOrgUnit | null | undefined
): boolean {
  if (unitKind === 'administration') return !parent
  if (!parent) return false
  if (unitKind === 'section') return parent.unitKind === 'administration'
  return parent.unitKind === 'section' || parent.unitKind === 'subsection'
}
