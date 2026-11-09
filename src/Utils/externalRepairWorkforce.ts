import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { employeeMatchesOrgFilter } from './employeeOrgPicker'
import { externalRepairSections, productionAreaOrgUnitId } from './productionAreaCounts'

export function filterWorkforceByOrgUnit(
  employees: Employee[],
  units: FactoryOrgUnit[],
  orgUnitId: string | null
): Employee[] {
  if (!orgUnitId) return employees.filter(e => e.isActive)
  return employees.filter(e => e.isActive && employeeMatchesOrgFilter(e.factoryOrgUnitId, orgUnitId, units))
}

export function externalRepairSectionOrParentId(
  units: FactoryOrgUnit[],
  sectionId: string | null
): string | null {
  if (sectionId && units.some(u => u.id === sectionId)) return sectionId
  return productionAreaOrgUnitId(units, 'externalRepair')
}

export { externalRepairSections }
