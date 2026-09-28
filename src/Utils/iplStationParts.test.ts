import { describe, expect, it } from 'vitest'
import type { BomItemDetail } from '../Types/bom'
import { groupIplFittedPartsByStation, iplPartIdFromNotes, iplPartNote, iplStationKey } from './iplStationParts'

function row(partial: Partial<BomItemDetail> & Pick<BomItemDetail, 'id' | 'part_id'>): BomItemDetail {
  return {
    part_number: 'PN',
    part_name_ar: 'جزء',
    quantity: 1,
    station_code_text: 'PBS-01',
    vehicle_model_name: 'T4-PRO L',
    source_sheet: 'ipl',
    is_active: true,
    ...partial
  } as BomItemDetail
}

describe('ipl station parts', () => {
  it('round-trips the part id stored on an operation', () => {
    expect(iplPartIdFromNotes(iplPartNote('part-1'))).toBe('part-1')
    expect(iplPartIdFromNotes('رف رك ي')).toBeNull()
  })

  it('treats worker-line codes as the master station', () => {
    expect(iplStationKey('PBS-01')).toBe(iplStationKey('PBS01-L1'))
  })

  it('keeps only fitted parts for the selected model and station', () => {
    const grouped = groupIplFittedPartsByStation(
      [
        row({ id: 'a', part_id: 'p1', part_number: 'A-1', station_code_text: 'PBS-01' }),
        row({
          id: 'b',
          part_id: 'p2',
          part_number: 'B-1',
          station_code_text: 'PBS-02',
          vehicle_model_name: 'T4-PRO L'
        }),
        row({
          id: 'c',
          part_id: 'p3',
          part_number: 'NA',
          quantity: 0,
          source_sheet: 'ipl_not_fitted',
          station_code_text: 'PBS-01'
        }),
        row({
          id: 'd',
          part_id: 'p4',
          part_number: 'D-1',
          station_code_text: 'PBS-01',
          vehicle_model_name: 'T8-PRO'
        })
      ],
      'T4-PRO L'
    )
    const pbs01 = grouped.get(iplStationKey('PBS-01')) ?? []
    expect(pbs01.map(p => p.partNumber)).toEqual(['A-1'])
    expect(grouped.get(iplStationKey('PBS-02'))?.map(p => p.partNumber)).toEqual(['B-1'])
  })
})
