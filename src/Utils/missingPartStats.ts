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

export type StoppageReasonRow = {
  reason: string
  reasonClass: string
  vehicleCount: number
  lineCount: number
}

export type StoppageDepartmentRow = {
  department: string
  vehicleCount: number
  lineCount: number
  reasons: StoppageReasonRow[]
}

type ReasonAcc = { reason: string; reasonClass: string; vehicles: Set<string>; lines: number }
type DeptAcc = { vehicles: Set<string>; lines: number; reasons: Map<string, ReasonAcc> }

/** Open shortages grouped by causing department, with unique vehicle counts. */
export function buildStoppageReportByDepartment(items: MissingPartDetail[]): StoppageDepartmentRow[] {
  const byDept = new Map<string, DeptAcc>()

  for (const item of items) {
    if (!isActiveShortageLine(item)) continue
    const deptKey = item.department?.trim() || ''
    const acc = byDept.get(deptKey) ?? { vehicles: new Set(), lines: 0, reasons: new Map() }
    acc.vehicles.add(item.vehicleId)
    acc.lines += 1
    const reason = item.partDescription.trim() || '—'
    const reasonKey = `${reason}|${item.reason}`
    const reasonAcc = acc.reasons.get(reasonKey) ?? {
      reason,
      reasonClass: item.reason,
      vehicles: new Set(),
      lines: 0
    }
    reasonAcc.vehicles.add(item.vehicleId)
    reasonAcc.lines += 1
    acc.reasons.set(reasonKey, reasonAcc)
    byDept.set(deptKey, acc)
  }

  return [...byDept.entries()]
    .map(([department, acc]) => ({
      department,
      vehicleCount: acc.vehicles.size,
      lineCount: acc.lines,
      reasons: [...acc.reasons.values()]
        .map(row => ({
          reason: row.reason,
          reasonClass: row.reasonClass,
          vehicleCount: row.vehicles.size,
          lineCount: row.lines
        }))
        .sort((a, b) => b.vehicleCount - a.vehicleCount || a.reason.localeCompare(b.reason, 'ar'))
    }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount || a.department.localeCompare(b.department, 'ar'))
}
