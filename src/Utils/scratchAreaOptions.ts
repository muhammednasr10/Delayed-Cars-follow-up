import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { orgPathFromLeaf, orgPathLabel } from './employeeOrgPicker'

export type ScratchAreaOption = {
  id: string
  label: string
}

/** Leaf org units (trim areas, chassis, final, etc.) from Settings → Administrations. */
export function scratchAreaOptions(units: FactoryOrgUnit[]): ScratchAreaOption[] {
  const active = units.filter(u => u.isActive)
  const hasChild = new Set<string>()
  for (const u of active) {
    if (u.parentId) hasChild.add(u.parentId)
  }

  return active
    .filter(u => u.unitKind !== 'administration' && !hasChild.has(u.id))
    .map(u => ({
      id: u.id,
      label: orgPathLabel(orgPathFromLeaf(u.id, units), units) ?? u.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
}

export function scratchAreaLabel(unitId: string | null | undefined, units: FactoryOrgUnit[]): string {
  if (!unitId) return ''
  const unit = units.find(u => u.id === unitId)
  if (!unit) return ''
  return orgPathLabel(orgPathFromLeaf(unitId, units), units) ?? unit.name
}
