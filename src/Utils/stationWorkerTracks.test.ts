import { describe, expect, it } from 'vitest'
import { stationWorkerTrackCount, stationWorkerTrackIndexes, stationWorkerTrackLabel } from './stationWorkerTracks'

describe('stationWorkerTrackCount', () => {
  const master = { id: 'st39', station_number: 'ST-39', headcount_workers: 3 }

  it('uses headcount from line balancing', () => {
    expect(stationWorkerTrackCount(master, [])).toBe(3)
  })

  it('falls back to active worker lines when headcount missing', () => {
    const stations = [
      {
        station_number: 'ST39-L1',
        parent_station_id: 'st39',
        is_active: true
      },
      {
        station_number: 'ST39-L2',
        parent_station_id: 'st39',
        is_active: true
      },
      {
        station_number: 'ST39-L4',
        parent_station_id: 'st39',
        is_active: false
      }
    ]
    expect(stationWorkerTrackCount({ ...master, headcount_workers: null }, stations)).toBe(2)
  })

  it('defaults to 1 when nothing is set', () => {
    expect(stationWorkerTrackCount({ ...master, headcount_workers: null }, [])).toBe(1)
  })
})

describe('stationWorkerTrack helpers', () => {
  it('builds labels and indexes', () => {
    expect(stationWorkerTrackLabel('ST-39', 3)).toBe('ST-39-L3')
    expect(stationWorkerTrackIndexes(3)).toEqual([1, 2, 3])
  })
})
