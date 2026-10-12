import type { AttendanceDayStatus } from '../Types/attendance'
import type { Employee } from '../Types/employee'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { ProductionArea } from '../Types/navigation'
import { PRODUCTION_AREA_ORDER } from '../Types/navigation'
import type { PlanDayType } from '../Types/productionPlanWorkDayDaily'
import { countPresentToday } from '../services/attendanceService'
import { findOrgUnitIdByPath } from './assemblyWorkforce'
import { employeeMatchesOrgFilter } from './employeeOrgPicker'

/** أسماء قسم الإنتاج تحت إدارة «الإنتاج». أول اسم مطابق في الهيكل هو المعتمد. */
export const PRODUCTION_AREA_ORG_NAME_CANDIDATES: Record<ProductionArea, readonly string[]> = {
  body: ['البودي', 'البودى'],
  paint: ['الدهان'],
  assembly: ['التجميع'],
  externalRepair: ['الإصلاح الخارجي', 'الاصلاح الخارجي']
}

export function productionAreaOrgUnitId(units: FactoryOrgUnit[], area: ProductionArea): string | null {
  for (const name of PRODUCTION_AREA_ORG_NAME_CANDIDATES[area]) {
    const id = findOrgUnitIdByPath(units, ['الإنتاج', name])
    if (id) return id
  }
  return null
}

type WorkforceEmployee = Pick<Employee, 'id' | 'isActive' | 'factoryOrgUnitId'>

/** null عندما قسم المنطقة غير موجود في الهيكل. */
export function workforceIdsForArea(
  employees: WorkforceEmployee[],
  units: FactoryOrgUnit[],
  area: ProductionArea
): string[] | null {
  const areaId = productionAreaOrgUnitId(units, area)
  if (!areaId) return null
  return employees
    .filter(employee => employee.isActive && employeeMatchesOrgFilter(employee.factoryOrgUnitId, areaId, units))
    .map(employee => employee.id)
}

export type AreaAttendanceCount = {
  present: number
  workforce: number
}

export function attendanceByProductionArea(
  employees: WorkforceEmployee[],
  units: FactoryOrgUnit[],
  dayRecords: { employeeId: string; workDate: string; status: AttendanceDayStatus }[],
  today: string,
  planDayType: PlanDayType | null
): Record<ProductionArea, AreaAttendanceCount | null> {
  const counts = {} as Record<ProductionArea, AreaAttendanceCount | null>
  for (const area of PRODUCTION_AREA_ORDER) {
    const ids = workforceIdsForArea(employees, units, area)
    if (!ids) {
      counts[area] = null
      continue
    }
    counts[area] = {
      present: countPresentToday(ids, dayRecords, today, planDayType),
      workforce: ids.length
    }
  }
  return counts
}

type OpenShortage = {
  vehicleId: string
  factoryOrgUnitId: string | null
  shortageResolvedAt: string | null
}

export type AreaShortageVehicleCounts = {
  active: number
  archive: number
}

/** سيارات النواقص الحالية والأرشيف التي تبعيتها داخل القسم. null إذا القسم غير موجود. */
export function shortageVehicleCountsByArea(
  parts: OpenShortage[],
  units: FactoryOrgUnit[],
  area: ProductionArea
): AreaShortageVehicleCounts | null {
  const areaId = productionAreaOrgUnitId(units, area)
  if (!areaId) return null
  const active = new Set<string>()
  const archive = new Set<string>()
  for (const part of parts) {
    if (!employeeMatchesOrgFilter(part.factoryOrgUnitId, areaId, units)) continue
    if (part.shortageResolvedAt) archive.add(part.vehicleId)
    else active.add(part.vehicleId)
  }
  return { active: active.size, archive: archive.size }
}

/** سيارات النواقص المفتوحة التي تبعيتها داخل القسم. null إذا القسم غير موجود. */
export function openShortageVehiclesByArea(
  parts: OpenShortage[],
  units: FactoryOrgUnit[],
  area: ProductionArea
): number | null {
  const counts = shortageVehicleCountsByArea(parts, units, area)
  return counts ? counts.active : null
}

export function openShortagesByProductionArea(
  parts: OpenShortage[],
  units: FactoryOrgUnit[]
): Record<ProductionArea, number | null> {
  const counts = {} as Record<ProductionArea, number | null>
  for (const area of PRODUCTION_AREA_ORDER) {
    counts[area] = openShortageVehiclesByArea(parts, units, area)
  }
  return counts
}
