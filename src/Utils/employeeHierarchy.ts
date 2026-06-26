import type { Employee } from '../Types/employee'

/** Build map: managerId -> direct report employee ids */
function directReportsMap(employees: Employee[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const e of employees) {
    for (const managerId of e.directManagerIds) {
      const list = map.get(managerId) ?? []
      list.push(e.id)
      map.set(managerId, list)
    }
  }
  return map
}

/** All descendants in org tree below managerId (not including manager). */
export function collectSubordinateIds(employees: Employee[], managerId: string): Set<string> {
  const byManager = directReportsMap(employees)
  const out = new Set<string>()
  const stack = [...(byManager.get(managerId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (out.has(id)) continue
    out.add(id)
    for (const child of byManager.get(id) ?? []) stack.push(child)
  }
  return out
}

export function isSubordinateOf(employees: Employee[], subordinateId: string, managerId: string): boolean {
  return collectSubordinateIds(employees, managerId).has(subordinateId)
}

export function getDirectReports(employees: Employee[], managerId: string): Employee[] {
  const ids = new Set<string>()
  for (const e of employees) {
    if (e.directManagerIds.includes(managerId)) ids.add(e.id)
  }
  return employees.filter(e => ids.has(e.id))
}

export function getMyManagers(employees: Employee[], employeeId: string): Employee[] {
  const me = employees.find(e => e.id === employeeId)
  if (!me) return []
  const ids = new Set(me.directManagerIds)
  return employees.filter(e => ids.has(e.id))
}

export function filterAssignableEmployees(employees: Employee[], managerId: string | null, isAdmin: boolean): Employee[] {
  const active = employees.filter(e => e.isActive)
  if (isAdmin || !managerId) return active
  const subIds = collectSubordinateIds(employees, managerId)
  return active.filter(e => subIds.has(e.id))
}

export function hasSubordinates(employees: Employee[], managerId: string | null): boolean {
  if (!managerId) return false
  return collectSubordinateIds(employees, managerId).size > 0
}
