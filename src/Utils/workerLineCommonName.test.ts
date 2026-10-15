import { describe, expect, it } from 'vitest'
import { workerLineCommonName } from './workerLineCommonName'

const master = { id: 'pbs', station_number: 'PBS01' }

describe('workerLineCommonName', () => {
  it('uses each worker line common name from line balancing', () => {
    const stations = [
      { id: 'pbs', station_number: 'PBS01', parent_station_id: null, worker1_operations_summary: null, is_active: true },
      {
        id: 'l1',
        station_number: 'PBS01-L1',
        parent_station_id: 'pbs',
        worker1_operations_summary: 'الأكر',
        is_active: true
      },
      {
        id: 'l2',
        station_number: 'PBS01-L2',
        parent_station_id: 'pbs',
        worker1_operations_summary: 'الباب',
        is_active: true
      }
    ]
    expect(workerLineCommonName(stations, master, 1)).toBe('الأكر')
    expect(workerLineCommonName(stations, master, 2)).toBe('الباب')
    expect(workerLineCommonName(stations, master, 3)).toBe('')
  })
})
