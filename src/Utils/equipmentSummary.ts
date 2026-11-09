import { EQUIPMENT_STATUSES, type EquipmentStatus, type LineEquipment } from '../Types/equipment'
import type { EquipmentKind } from '../Types/equipmentKind'

export type EquipmentKindCounts = {
  code: string
  total: number
  assigned: number
  byStatus: Record<EquipmentStatus, number>
}

export type EquipmentSummary = {
  total: number
  assigned: number
  byStatus: Record<EquipmentStatus, number>
  byKind: EquipmentKindCounts[]
}

function emptyStatusCounts(): Record<EquipmentStatus, number> {
  return {
    active: 0,
    calibration_due: 0,
    out_of_service: 0,
    scrapped: 0
  }
}

export function buildEquipmentSummary(items: LineEquipment[], kinds: EquipmentKind[]): EquipmentSummary {
  const byStatus = emptyStatusCounts()
  const kindMap = new Map<string, EquipmentKindCounts>()

  function ensureKind(code: string): EquipmentKindCounts {
    let row = kindMap.get(code)
    if (!row) {
      row = { code, total: 0, assigned: 0, byStatus: emptyStatusCounts() }
      kindMap.set(code, row)
    }
    return row
  }

  for (const kind of kinds) ensureKind(kind.code)

  for (const item of items) {
    const status = EQUIPMENT_STATUSES.includes(item.status) ? item.status : 'active'
    byStatus[status] += 1
    const row = ensureKind(item.equipmentType || 'other')
    row.total += 1
    row.byStatus[status] += 1
    if (item.assignedEmployeeId) row.assigned += 1
  }

  const catalogOrder = new Map(kinds.map((k, i) => [k.code, i]))
  const byKind = [...kindMap.values()].sort((a, b) => {
    const ai = catalogOrder.get(a.code)
    const bi = catalogOrder.get(b.code)
    if (ai != null && bi != null) return ai - bi
    if (ai != null) return -1
    if (bi != null) return 1
    return a.code.localeCompare(b.code)
  })

  return {
    total: items.length,
    assigned: items.filter(i => i.assignedEmployeeId).length,
    byStatus,
    byKind
  }
}
