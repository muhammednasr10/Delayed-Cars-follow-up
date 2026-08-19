import { describe, expect, it } from 'vitest'
import type { ShortageMissionLink } from '../Types/mission'
import { shortageMissionsForParts } from './shortageMissionLinks'

function link(overrides: Partial<ShortageMissionLink> & Pick<ShortageMissionLink, 'id'>): ShortageMissionLink {
  return {
    title: overrides.id,
    status: 'pending',
    sourceVehicleId: null,
    sourceMissingPartId: null,
    sourceScratchId: null,
    sourceVin: null,
    ...overrides
  }
}

describe('shortageMissionsForParts', () => {
  const parts = [
    { id: 'p1', vehicleId: 'v1', vin: 'VIN1' },
    { id: 'p2', vehicleId: 'v1', vin: 'VIN1' }
  ]

  it('matches by vehicle, part, or vin without duplicating', () => {
    const links = [
      link({ id: 'm1', sourceVehicleId: 'v1', sourceMissingPartId: 'p1', sourceVin: 'VIN1' }),
      link({ id: 'm2', sourceMissingPartId: 'p2' }),
      link({ id: 'm3', sourceVin: 'VIN1' }),
      link({ id: 'm4', sourceVehicleId: 'other', sourceVin: 'NOPE' })
    ]
    expect(shortageMissionsForParts(parts, links).map(m => m.id)).toEqual(['m1', 'm2', 'm3'])
  })

  it('matches by scratch id', () => {
    const links = [link({ id: 'm5', sourceScratchId: 'p1' }), link({ id: 'm6', sourceScratchId: 'other' })]
    expect(shortageMissionsForParts(parts, links).map(m => m.id)).toEqual(['m5'])
  })

  it('returns empty when either side is empty', () => {
    expect(shortageMissionsForParts([], [link({ id: 'm1', sourceVehicleId: 'v1' })])).toEqual([])
    expect(shortageMissionsForParts(parts, [])).toEqual([])
  })
})
