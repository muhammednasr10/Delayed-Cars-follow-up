import type { LineEquipment } from '../Types/equipment'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { ProductionArea } from '../Types/navigation'
import { productionAreaOrgUnitId } from './productionAreaCounts'
import { employeeMatchesOrgFilter } from './employeeOrgPicker'

export const EQUIPMENT_COUNT_AREAS = ['body', 'paint', 'assembly'] as const

export type EquipmentCountArea = (typeof EQUIPMENT_COUNT_AREAS)[number]

export type EquipmentKindAreaCounts = Record<EquipmentCountArea, number> & {
  total: number
  unassigned: number
}

type AssigneeOrg = { id: string; factoryOrgUnitId: string | null }

export function resolveEquipmentOrgUnitId(
  item: Pick<LineEquipment, 'orgUnitId' | 'assignedEmployeeId'>,
  assignees: AssigneeOrg[] = []
): string | null {
  if (item.orgUnitId) return item.orgUnitId
  if (!item.assignedEmployeeId) return null
  return assignees.find(a => a.id === item.assignedEmployeeId)?.factoryOrgUnitId ?? null
}

export function resolveEquipmentCountArea(
  orgUnitId: string | null,
  units: FactoryOrgUnit[]
): EquipmentCountArea | null {
  if (!orgUnitId) return null
  for (const area of EQUIPMENT_COUNT_AREAS) {
    const areaId = productionAreaOrgUnitId(units, area as ProductionArea)
    if (areaId && employeeMatchesOrgFilter(orgUnitId, areaId, units)) return area
  }
  return null
}

export function emptyKindAreaCounts(): EquipmentKindAreaCounts {
  return { body: 0, paint: 0, assembly: 0, total: 0, unassigned: 0 }
}

export function buildEquipmentKindAreaCounts(
  items: Pick<LineEquipment, 'equipmentType' | 'orgUnitId' | 'assignedEmployeeId'>[],
  units: FactoryOrgUnit[],
  assignees: AssigneeOrg[] = []
): Map<string, EquipmentKindAreaCounts> {
  const map = new Map<string, EquipmentKindAreaCounts>()

  function ensure(code: string): EquipmentKindAreaCounts {
    let row = map.get(code)
    if (!row) {
      row = emptyKindAreaCounts()
      map.set(code, row)
    }
    return row
  }

  for (const item of items) {
    const code = item.equipmentType || 'other'
    const row = ensure(code)
    row.total += 1
    const orgId = resolveEquipmentOrgUnitId(item, assignees)
    const area = resolveEquipmentCountArea(orgId, units)
    if (area) row[area] += 1
    else row.unassigned += 1
  }

  return map
}
