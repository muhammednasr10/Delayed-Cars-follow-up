import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { JobRole } from '../Types/enums'
import { areasInName, type AssemblyArea } from './assemblyAreas'
import { collectSubordinateIds } from './employeeHierarchy'
import { filterWorkforceByOrgScope } from './factoryOrgScope'

/** إنتاجية الدخول (تريم أ/ب) مقابل الخروج (شاسيه/فاينال) */
export type AssemblyLineScope = 'entry' | 'exit'

const SUPERVISOR_SCOPE_ROLES: JobRole[] = ['supervisor', 'assistant_supervisor']

export function workAreaAssemblyScope(workAreaName: string | null | undefined): AssemblyLineScope | null {
  const areas = areasInName(workAreaName)
  if (areas.has('trim_a') || areas.has('trim_b')) return 'entry'
  if (areas.has('chassis') || areas.has('final')) return 'exit'
  return null
}

/** نطاق المشرف من قسمه ومرؤوسيه. المساعد لا يرث قسم المشرف الأب. */
function collectViewerAreas(employees: Employee[], viewerId: string): Set<AssemblyArea> {
  const viewer = employees.find(employee => employee.id === viewerId)
  if (!viewer) return new Set()

  const areas = new Set<AssemblyArea>()
  for (const area of areasInName(viewer.workAreaName)) areas.add(area)

  for (const id of collectSubordinateIds(employees, viewerId)) {
    const subordinate = employees.find(employee => employee.id === id)
    if (!subordinate) continue
    for (const area of areasInName(subordinate.workAreaName)) areas.add(area)
  }

  return areas
}

function employeeAreas(employee: Employee): Set<AssemblyArea> {
  return areasInName(employee.workAreaName)
}

/**
 * يقيّد عمالة التجميع حسب المشرف/مساعد المشرف:
 * - مشرف تريم أ وب يرى عمال القسمين
 * - مساعد تريم أ يرى تريم أ فقط، ومساعد تريم ب يرى تريم ب فقط
 * - نفس التقسيم للشاسيه والفاينال
 * - القائد يرى مرؤوسيه فقط
 */
export function filterAssemblyWorkforceForViewer(
  employees: Employee[],
  viewerEmployeeId: string | null,
  seesAll: boolean,
  orgUnits: FactoryOrgUnit[] = []
): Employee[] {
  if (orgUnits.length > 0) {
    const orgScoped = filterWorkforceByOrgScope(employees, viewerEmployeeId, seesAll, orgUnits)
    const viewer = viewerEmployeeId ? employees.find(employee => employee.id === viewerEmployeeId) : null
    if (viewer?.factoryOrgUnitId) return orgScoped
  }

  if (seesAll || !viewerEmployeeId) return employees

  const viewer = employees.find(employee => employee.id === viewerEmployeeId)
  if (!viewer) return employees

  const subordinateIds = collectSubordinateIds(employees, viewerEmployeeId)
  subordinateIds.add(viewerEmployeeId)

  if (SUPERVISOR_SCOPE_ROLES.includes(viewer.jobRole)) {
    const scopeAreas = collectViewerAreas(employees, viewerEmployeeId)
    if (scopeAreas.size === 0) {
      return employees.filter(employee => subordinateIds.has(employee.id))
    }
    return employees.filter(employee => {
      if (subordinateIds.has(employee.id)) return true
      for (const area of employeeAreas(employee)) {
        if (scopeAreas.has(area)) return true
      }
      return false
    })
  }

  if (viewer.jobRole === 'leader') {
    return employees.filter(employee => subordinateIds.has(employee.id))
  }

  return employees.filter(employee => employee.id === viewerEmployeeId)
}
