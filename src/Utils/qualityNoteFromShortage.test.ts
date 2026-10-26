import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import type { Station, VehicleModel } from '../Types/settings'
import { qualityNoteDraftFromShortage } from './qualityNoteFromShortage'

function part(overrides: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>): MissingPartDetail {
  return {
    partDescription: 'بدون كراسي',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'stores',
    completingDepartment: null,
    followUpEmployeeId: null,
    followUpEmployeeName: null,
    followUpEmployeeIds: [],
    followUpEmployeeNames: null,
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    modelName: 'T8C7',
    colorName: null,
    colorCode: null,
    colorHex: null,
    stationNumber: 'PBS-01',
    stationName: null,
    stationLineName: null,
    stationArea: null,
    stationDepartment: null,
    stationPerson: null,
    createdBy: null,
    createdByName: null,
    createdByEmail: null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    shortageResolvedAt: null,
    transferredAt: null,
    reportGroupId: null,
    stationId: 'st-1',
    factoryOrgUnitId: null,
    shortageResolvedByName: null,
    pendingTransferRequestId: null,
    pendingRestoreRequestId: null,
    ...overrides
  }
}

describe('qualityNoteDraftFromShortage', () => {
  it('fills VIN, model, station and description from the shortage', () => {
    const models = [{ id: 'm1', name: 'T8C7' }] as VehicleModel[]
    const stations = [{ id: 'st-1', station_number: 'PBS01' }] as Station[]
    const draft = qualityNoteDraftFromShortage(
      [
        part({ id: '1', vehicleId: 'v1', vin: '5052' }),
        part({ id: '2', vehicleId: 'v1', vin: '5052', partDescription: 'خرطوم' })
      ],
      models,
      stations,
      'fitment'
    )
    expect(draft.form.vins).toEqual(['5052'])
    expect(draft.form.specifyVins).toBe(true)
    expect(draft.form.vehicleModelIds).toEqual(['m1'])
    expect(draft.form.stationId).toBe('st-1')
    expect(draft.form.description).toContain('بدون كراسي')
    expect(draft.form.description).toContain('خرطوم')
    expect(draft.form.category).toBe('fitment')
  })
})
