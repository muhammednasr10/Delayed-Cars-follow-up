import type { DepartmentVehicleCount, MissingPartDetail } from '../Types/missingPart'

function isActiveShortageLine(i: MissingPartDetail): boolean {
  return !i.shortageResolvedAt && i.status !== 'closed' && i.status !== 'cancelled'
}

/** Distinct vehicles with open shortages, grouped by responsible department. */
export function countActiveVehiclesByDepartment(items: MissingPartDetail[]): DepartmentVehicleCount[] {
  const byDept = new Map<string, Set<string>>()
  for (const i of items) {
    if (!isActiveShortageLine(i)) continue
    const dept = i.department || 'unknown'
    if (!byDept.has(dept)) byDept.set(dept, new Set())
    byDept.get(dept)!.add(i.vehicleId)
  }
  return Array.from(byDept.entries())
    .map(([department, vehicles]) => ({ department, vehicleCount: vehicles.size }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount)
}
