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
  externalRepair: [
    'الإصلاح النهائي',
    'الإصلاح النهائى',
    'الاصلاح النهائي',
    'الاصلاح النهائى',
    'الإصلاح الخارجي',
    'الإصلاح الخارجى',
    'الاصلاح الخارجي',
    'الاصلاح الخارجى',
    'الإصلاح الداخلي',
    'الإصلاح الداخلى'
  ]
}

/** المواقع تحت الإصلاح النهائي / الخارجي. */
export const EXTERNAL_REPAIR_SITE_NAMES = ['غبور', 'القصراوى', 'القصرواى'] as const

/** الأقسام الثلاثة تحت كل موقع. */
export const EXTERNAL_REPAIR_DEPARTMENT_NAMES = [
  'ريبير نهائى',
  'ريبير نهائي',
  'إصلاح الدهان',
  'التسليم النهائى',
  'التسليم النهائي'
] as const

export function productionAreaOrgUnitId(units: FactoryOrgUnit[], area: ProductionArea): string | null {
  // الإصلاح النهائي إدارة علوية في الإدارات (وليس قسماً تحت الإنتاج فقط).
  if (area === 'externalRepair') {
    for (const name of PRODUCTION_AREA_ORG_NAME_CANDIDATES.externalRepair) {
      const top = units.find(
        unit =>
          unit.isActive &&
          unit.parentId == null &&
          unit.unitKind === 'administration' &&
          unit.name === name
      )
      if (top) return top.id
    }
  }
  for (const name of PRODUCTION_AREA_ORG_NAME_CANDIDATES[area]) {
    const id = findOrgUnitIdByPath(units, ['الإنتاج', name])
    if (id) return id
  }
  return null
}

function activeChildrenOf(units: FactoryOrgUnit[], parentId: string): FactoryOrgUnit[] {
  return units
    .filter(unit => unit.isActive && unit.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ar'))
}

function isPreferredName(name: string, preferred: readonly string[]): boolean {
  return preferred.some(item => item === name)
}

/** مواقع غبور / القصراوى المباشرة تحت الإصلاح النهائي. */
export function externalRepairSites(units: FactoryOrgUnit[]): FactoryOrgUnit[] {
  const parentId = productionAreaOrgUnitId(units, 'externalRepair')
  if (!parentId) return []
  const children = activeChildrenOf(units, parentId)
  const preferred = children.filter(unit => isPreferredName(unit.name, EXTERNAL_REPAIR_SITE_NAMES))
  return preferred.length > 0 ? preferred : children
}

/** الأقسام الثلاثة تحت موقع (ريبير نهائى / إصلاح الدهان / التسليم النهائى). */
export function externalRepairDepartments(units: FactoryOrgUnit[], siteId: string): FactoryOrgUnit[] {
  const children = activeChildrenOf(units, siteId)
  const preferred = children.filter(unit => isPreferredName(unit.name, EXTERNAL_REPAIR_DEPARTMENT_NAMES))
  return preferred.length > 0 ? preferred : children
}

/** @deprecated التبويبات العليا بقت المواقع — يُرجع مواقع الإصلاح. */
export function externalRepairSections(units: FactoryOrgUnit[]): FactoryOrgUnit[] {
  return externalRepairSites(units)
}

/** إن كان المعرف قسماً يُرجع الموقع الأب؛ وإلا الموقع نفسه إن وُجد. */
export function externalRepairSiteForSelection(
  units: FactoryOrgUnit[],
  selectionId: string | null
): FactoryOrgUnit | null {
  if (!selectionId) return null
  const selected = units.find(unit => unit.id === selectionId)
  if (!selected) return null
  const sites = externalRepairSites(units)
  if (sites.some(site => site.id === selected.id)) return selected
  if (selected.parentId) {
    const parent = sites.find(site => site.id === selected.parentId)
    if (parent) return parent
  }
  return null
}

/** إن كان المعرف موقعاً يُرجع أول قسم تحته؛ وإلا القسم نفسه. */
export function resolveExternalRepairWorkforceUnitId(
  units: FactoryOrgUnit[],
  selectionId: string | null
): string | null {
  if (!selectionId) return null
  const selected = units.find(unit => unit.id === selectionId)
  if (!selected) return null
  const departments = externalRepairDepartments(units, selected.id)
  if (departments.length > 0) return departments[0]!.id
  return selected.id
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
