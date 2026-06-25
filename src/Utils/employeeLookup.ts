import type { Employee } from '../Types/employee'

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** يطابق بداية الكود أو بداية الاسم أو بداية أي كلمة في الاسم */
function matchesEmployeePrefix(employee: Employee, term: string): boolean {
  const code = employee.employeeCode.toLowerCase()
  const name = employee.fullName.toLowerCase()
  if (code.startsWith(term) || name.startsWith(term)) return true
  return name.split(/\s+/).some(word => word.startsWith(term))
}

export function findEmployeesByQuery(employees: Employee[], query: string, limit = 12): Employee[] {
  const term = normalizeQuery(query)
  if (!term) return []
  return employees.filter(e => matchesEmployeePrefix(e, term)).slice(0, limit)
}

export function findExactEmployee(employees: Employee[], query: string): Employee | null {
  const term = normalizeQuery(query)
  if (!term) return null
  const byCode = employees.find(e => e.employeeCode.toLowerCase() === term)
  if (byCode) return byCode
  const byName = employees.find(e => e.fullName.toLowerCase() === term)
  if (byName) return byName
  const prefixMatches = employees.filter(e => matchesEmployeePrefix(e, term))
  return prefixMatches.length === 1 ? prefixMatches[0] : null
}

export function employeeLookupLabel(employee: Employee): string {
  return `${employee.fullName} (${employee.employeeCode})`
}
