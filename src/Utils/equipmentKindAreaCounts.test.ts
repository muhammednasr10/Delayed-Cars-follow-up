import { describe, expect, it } from 'vitest'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import {
  buildEquipmentKindAreaCounts,
  resolveEquipmentCountArea
} from './equipmentKindAreaCounts'

function unit(
  id: string,
  name: string,
  parentId: string | null,
  kind: FactoryOrgUnit['unitKind'] = 'section'
): FactoryOrgUnit {
  return {
    id,
    name,
    parentId,
    unitKind: kind,
    sortOrder: 0,
    isActive: true
  }
}

const units: FactoryOrgUnit[] = [
  unit('prod', 'الإنتاج', null, 'administration'),
  unit('body', 'البودي', 'prod'),
  unit('weld', 'اللحام', 'body', 'subsection'),
  unit('paint', 'الدهان', 'prod'),
  unit('assembly', 'التجميع', 'prod'),
  unit('trim', 'تريم أ', 'assembly', 'subsection')
]

describe('resolveEquipmentCountArea', () => {
  it('maps nested org units under body/paint/assembly', () => {
    expect(resolveEquipmentCountArea('weld', units)).toBe('body')
    expect(resolveEquipmentCountArea('paint', units)).toBe('paint')
    expect(resolveEquipmentCountArea('trim', units)).toBe('assembly')
    expect(resolveEquipmentCountArea(null, units)).toBeNull()
  })
})

describe('buildEquipmentKindAreaCounts', () => {
  it('counts each kind by production area', () => {
    const map = buildEquipmentKindAreaCounts(
      [
        { equipmentType: 'rivet_gun', orgUnitId: 'weld', assignedEmployeeId: null },
        { equipmentType: 'rivet_gun', orgUnitId: 'trim', assignedEmployeeId: null },
        { equipmentType: 'rivet_gun', orgUnitId: null, assignedEmployeeId: 'e1' },
        { equipmentType: 'torque_wrench', orgUnitId: 'paint', assignedEmployeeId: null }
      ],
      units,
      [{ id: 'e1', factoryOrgUnitId: 'assembly' }]
    )

    const rivet = map.get('rivet_gun')!
    expect(rivet.total).toBe(3)
    expect(rivet.body).toBe(1)
    expect(rivet.assembly).toBe(2)
    expect(rivet.paint).toBe(0)
    expect(rivet.unassigned).toBe(0)

    const torque = map.get('torque_wrench')!
    expect(torque.paint).toBe(1)
    expect(torque.total).toBe(1)
  })
})
