import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { employeeMatchesOrgFilter, orgPathFromLeaf } from './employeeOrgPicker'

/** التبعية التنظيمية لعمال التجميع: إدارة الإنتاج → قسم التجميع */
export const ASSEMBLY_ORG_PATH_NAMES = ['الإنتاج', 'التجميع'] as const

export function findOrgUnitIdByPath(units: FactoryOrgUnit[], pathNames: readonly string[]): string | null {
  if (pathNames.length === 0) return null
  let parentId: string | null = null
  for (const name of pathNames) {
    const match = units.find(u => (u.parentId ?? null) === parentId && u.name === name)
    if (!match) return null
    parentId = match.id
  }
  return parentId
}

export function assemblyOrgUnitId(units: FactoryOrgUnit[]): string | null {
  return findOrgUnitIdByPath(units, ASSEMBLY_ORG_PATH_NAMES)
}

export function assemblyOrgPath(units: FactoryOrgUnit[]): string[] {
  const leafId = assemblyOrgUnitId(units)
  return leafId ? orgPathFromLeaf(leafId, units) : []
}

export function isAssemblyWorkforceEmployee(
  employee: Pick<Employee, 'factoryOrgUnitId'>,
  units: FactoryOrgUnit[],
  assemblyId = assemblyOrgUnitId(units)
): boolean {
  if (!assemblyId) return false
  return employeeMatchesOrgFilter(employee.factoryOrgUnitId, assemblyId, units)
}

export function filterAssemblyWorkforce(employees: Employee[], units: FactoryOrgUnit[]): Employee[] {
  const assemblyId = assemblyOrgUnitId(units)
  if (!assemblyId) {
    // قبل إعداد التبعية (migration 0108) لا نُخفي العمالة — وإلا يختفي الحضور المسجّل
    return employees.filter(e => e.isActive)
  }
  return employees.filter(e => isAssemblyWorkforceEmployee(e, units, assemblyId))
}

/** true عندما لم يُعثر على قسم التجميع في الهيكل التنظيمي */
export function isAssemblyWorkforceFilterMissing(units: FactoryOrgUnit[]): boolean {
  return units.length > 0 && assemblyOrgUnitId(units) == null
}
