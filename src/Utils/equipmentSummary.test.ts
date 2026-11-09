import { describe, expect, it } from 'vitest'
import { FALLBACK_EQUIPMENT_KINDS } from '../Types/equipmentKind'
import type { LineEquipment } from '../Types/equipment'
import { buildEquipmentSummary } from './equipmentSummary'

function item(partial: Partial<LineEquipment> & Pick<LineEquipment, 'id' | 'equipmentType'>): LineEquipment {
  return {
    equipmentCode: partial.id,
    name: null,
    model: null,
    serialNumber: null,
    location: null,
    orgUnitId: null,
    assignedEmployeeId: null,
    workerCommonName: '',
    status: 'active',
    operatingRange: '',
    efficiencyPercent: null,
    lastCalibrationAt: null,
    lastCalibrationResult: null,
    nextCalibrationDue: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
    ...partial
  }
}

describe('buildEquipmentSummary', () => {
  it('counts each kind and status, including empty catalog kinds', () => {
    const stats = buildEquipmentSummary(
      [
        item({ id: '1', equipmentType: 'rivet_gun', status: 'active' }),
        item({ id: '2', equipmentType: 'rivet_gun', status: 'calibration_due', assignedEmployeeId: 'e1' }),
        item({ id: '3', equipmentType: 'torque_wrench', status: 'scrapped' }),
        item({ id: '4', equipmentType: 'air_gun', status: 'out_of_service' })
      ],
      FALLBACK_EQUIPMENT_KINDS
    )

    expect(stats.total).toBe(4)
    expect(stats.assigned).toBe(1)
    expect(stats.byStatus.active).toBe(1)
    expect(stats.byStatus.calibration_due).toBe(1)
    expect(stats.byStatus.out_of_service).toBe(1)
    expect(stats.byStatus.scrapped).toBe(1)

    const rivet = stats.byKind.find(k => k.code === 'rivet_gun')
    expect(rivet?.total).toBe(2)
    expect(rivet?.assigned).toBe(1)
    expect(rivet?.byStatus.calibration_due).toBe(1)

    const other = stats.byKind.find(k => k.code === 'other')
    expect(other?.total).toBe(0)

    const air = stats.byKind.find(k => k.code === 'air_gun')
    expect(air?.total).toBe(1)
  })
})
