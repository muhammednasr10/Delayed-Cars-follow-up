import { describe, expect, it } from 'vitest'
import type { Station } from '../Types/settings'
import { isQualityTransferStation, qualityTransferStations } from './qualityTransferStations'

function station(overrides: Partial<Station> & Pick<Station, 'id' | 'station_number'>): Station {
  return {
    station_name: overrides.station_number,
    is_active: true,
    station_type: 'main_line',
    ...overrides
  }
}

describe('qualityTransferStations', () => {
  it('includes only active quality-type stations', () => {
    const list = qualityTransferStations([
      station({ id: '1', station_number: 'QP3', station_type: 'quality' }),
      station({ id: '2', station_number: 'A10', station_type: 'quality' }),
      station({ id: '3', station_number: 'B20', station_type: 'main_line' }),
      station({ id: '4', station_number: 'QP1', station_type: 'quality', is_active: false })
    ])
    expect(list.map(s => s.station_number)).toEqual(['A10', 'QP3'])
  })

  it('rejects inactive or non-quality stations', () => {
    expect(isQualityTransferStation(station({ id: '1', station_number: 'QP3', station_type: 'quality', is_active: false }))).toBe(
      false
    )
    expect(isQualityTransferStation(station({ id: '2', station_number: 'TR1' }))).toBe(false)
  })
})
