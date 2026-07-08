import type { Employee } from '../Types/employee'

export function isFormerEmployee(employee: Pick<Employee, 'employmentStatus'>): boolean {
  return employee.employmentStatus === 'resigned' || employee.employmentStatus === 'terminated'
}

export function isCurrentRosterEmployee(employee: Pick<Employee, 'employmentStatus'>): boolean {
  return !isFormerEmployee(employee)
}
