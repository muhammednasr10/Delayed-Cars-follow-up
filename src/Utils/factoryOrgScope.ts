import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { JobRole } from '../Types/enums'
import { collectSubordinateIds } from './employeeHierarchy'
import { employeeMatchesOrgFilter } from './employeeOrgPicker'

const SUPERVISOR_ROLES: JobRole[] = ['supervisor', 'assistant_supervisor', 'leader']

/** هل السجل ضمن نطاق القسم/القسم الفرعي للمشرف؟ */
export function recordMatchesOrgScope(
  recordOrgUnitId: string | null | undefined,
  scopeRootId: string | null,
  seesAll: boolean,
  units: FactoryOrgUnit[]
): boolean {
  if (seesAll) return true
  if (!scopeRootId) return true
  if (!recordOrgUnitId) return false
  return employeeMatchesOrgFilter(recordOrgUnitId, scopeRootId, units)
}

export function filterRecordsByOrgScope<T extends { factoryOrgUnitId?: string | null }>(
  records: T[],
  scopeRootId: string | null,
  seesAll: boolean,
  units: FactoryOrgUnit[]
): T[] {
  if (seesAll || !scopeRootId) return records
  return records.filter(r => recordMatchesOrgScope(r.factoryOrgUnitId, scopeRootId, false, units))
}

/**
 * عمالة ضمن نطاق المشرف:
 * - ربط القسم في صفحة العمالة يحدد ما يراه (تريم أ&ب → كل ما تحته، تريم أ → تريم أ فقط)
 * - يشمل المرؤوسين المباشرين دائماً
 */
export function filterWorkforceByOrgScope(
  employees: Employee[],
  viewerEmployeeId: string | null,
  seesAll: boolean,
  units: FactoryOrgUnit[]
): Employee[] {
  if (seesAll || !viewerEmployeeId) return employees

  const viewer = employees.find(e => e.id === viewerEmployeeId)
  if (!viewer) return employees

  const subordinateIds = collectSubordinateIds(employees, viewerEmployeeId)
  subordinateIds.add(viewerEmployeeId)

  if (!viewer.factoryOrgUnitId || units.length === 0) {
    return employees.filter(e => subordinateIds.has(e.id))
  }

  const scopeRootId = viewer.factoryOrgUnitId

  if (!SUPERVISOR_ROLES.includes(viewer.jobRole)) {
    return employees.filter(e => e.id === viewerEmployeeId)
  }

  return employees.filter(e => {
    if (subordinateIds.has(e.id)) return true
    return employeeMatchesOrgFilter(e.factoryOrgUnitId, scopeRootId, units)
  })
}
