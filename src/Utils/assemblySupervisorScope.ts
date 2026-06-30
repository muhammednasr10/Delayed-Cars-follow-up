import type { Employee } from '../Types/employee'
import type { JobRole } from '../Types/enums'
import { collectSubordinateIds, getMyManagers } from './employeeHierarchy'

/** إنتاجية الدخول (تريم أ/ب) مقابل الخروج (شاسيه/فاينال) */
export type AssemblyLineScope = 'entry' | 'exit'

const ENTRY_AREA_PATTERNS = [
  /تريم\s*[أا]/i,
  /trim\s*a/i,
  /تريم\s*[بb]/i,
  /trim\s*b/i,
  /^تريم$/i,
  /^trim$/i
]

const EXIT_AREA_PATTERNS = [/شاسيه/i, /chassis/i, /فاينال/i, /final/i]

const SUPERVISOR_SCOPE_ROLES: JobRole[] = ['supervisor', 'assistant_supervisor']

export function workAreaAssemblyScope(workAreaName: string | null | undefined): AssemblyLineScope | null {
  const name = workAreaName?.trim()
  if (!name) return null
  if (ENTRY_AREA_PATTERNS.some(re => re.test(name))) return 'entry'
  if (EXIT_AREA_PATTERNS.some(re => re.test(name))) return 'exit'
  return null
}

function addScopeFromEmployee(kinds: Set<AssemblyLineScope>, employee: Employee) {
  const kind = workAreaAssemblyScope(employee.workAreaName)
  if (kind) kinds.add(kind)
}

function collectScopeKinds(employees: Employee[], viewerId: string): Set<AssemblyLineScope> {
  const viewer = employees.find(e => e.id === viewerId)
  if (!viewer) return new Set()

  const kinds = new Set<AssemblyLineScope>()
  addScopeFromEmployee(kinds, viewer)

  for (const id of collectSubordinateIds(employees, viewerId)) {
    const sub = employees.find(e => e.id === id)
    if (sub) addScopeFromEmployee(kinds, sub)
  }

  if (viewer.jobRole === 'assistant_supervisor') {
    for (const mgr of getMyManagers(employees, viewerId)) {
      if (mgr.jobRole !== 'supervisor') continue
      addScopeFromEmployee(kinds, mgr)
      for (const id of collectSubordinateIds(employees, mgr.id)) {
        const sub = employees.find(e => e.id === id)
        if (sub) addScopeFromEmployee(kinds, sub)
      }
    }
  }

  return kinds
}

/**
 * يقيّد عمالة التجميع حسب المشرف/مساعد المشرف:
 * - مشرف تريم أ/ب يرى عمال الدخول فقط
 * - مشرف الشاسيه/الفاينال يرى عمال الخروج فقط
 * - مساعد المشرف يرث نطاق مشرفه
 * - القائد يرى مرؤوسيه فقط
 */
export function filterAssemblyWorkforceForViewer(
  employees: Employee[],
  viewerEmployeeId: string | null,
  seesAll: boolean
): Employee[] {
  if (seesAll || !viewerEmployeeId) return employees

  const viewer = employees.find(e => e.id === viewerEmployeeId)
  if (!viewer) return employees

  const subordinateIds = collectSubordinateIds(employees, viewerEmployeeId)
  subordinateIds.add(viewerEmployeeId)

  if (SUPERVISOR_SCOPE_ROLES.includes(viewer.jobRole)) {
    const scopeKinds = collectScopeKinds(employees, viewerEmployeeId)
    if (scopeKinds.size === 0) {
      return employees.filter(e => subordinateIds.has(e.id))
    }
    return employees.filter(e => {
      if (subordinateIds.has(e.id)) return true
      const kind = workAreaAssemblyScope(e.workAreaName)
      return kind != null && scopeKinds.has(kind)
    })
  }

  if (viewer.jobRole === 'leader') {
    return employees.filter(e => subordinateIds.has(e.id))
  }

  return employees.filter(e => e.id === viewerEmployeeId)
}
