import { describe, expect, it } from 'vitest'
import type { Station } from '../Types/settings'
import { buildWorkerLineOptions } from './workerLineOptions'

function station(partial: Partial<Station> & Pick<Station, 'id' | 'station_number'>): Station {
  return {
    station_name: '',
    is_active: true,
    worker1_operations_summary: null,
    ...partial
  }
}

describe('buildWorkerLineOptions', () => {
  it('keeps only active worker lines that have a common name', () => {
    const options = buildWorkerLineOptions([
      station({ id: 'p', station_number: 'PBS01', station_name: 'parent' }),
      station({
        id: 'l1',
        station_number: 'PBS01-L1',
        worker1_operations_summary: 'الروف راك'
      }),
      station({
        id: 'l2',
        station_number: 'PBS01-L2',
        worker1_operations_summary: '  '
      }),
      station({
        id: 'l3',
        station_number: 'PBS01-L3',
        worker1_operations_summary: 'السقف',
        is_active: false
      })
    ])
    expect(options).toEqual([
      { stationId: 'l1', displayCode: 'PBS01-L1', commonName: 'الروف راك' }
    ])
  })
})
