import type { Employee } from '../Types/employee'

export function normalizeEmployeeCode(code: string): string {
  return code.trim().toLowerCase()
}

export function isEmployeeCodeTaken(
  code: string,
  employees: Pick<Employee, 'id' | 'employeeCode'>[],
  excludeEmployeeId?: string | null
): boolean {
  const norm = normalizeEmployeeCode(code)
  if (!norm) return false
  return employees.some(
    e => normalizeEmployeeCode(e.employeeCode) === norm && e.id !== excludeEmployeeId
  )
}
