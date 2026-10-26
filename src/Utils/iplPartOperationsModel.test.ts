import { describe, expect, it } from 'vitest'
import type { BomItemDetail } from '../Types/bom'
import type { StationOperationDetail } from '../Types/timeStudy'
import type { IplCompareRow } from './iplModelCompare'
import { iplPartNote } from './iplStationParts'
import { dedupeIplOperationsOnWorker, partFitsMultipleStations, stationGroupsOf } from './iplPartOperationsModel'

function op(id: string, notes: string): StationOperationDetail {
  return { id, notes, hardware: [] } as unknown as StationOperationDetail
}

function item(overrides: Partial<BomItemDetail> & Pick<BomItemDetail, 'id' | 'part_id'>): BomItemDetail {
  return {
    vehicle_model_id: null,
    station_id: null,
    part_number: 'Q-1',
    part_name: 'Bolt',
    quantity: 1,
    side: null,
    position: null,
    model_family: null,
    applicable_models_text: null,
    station_code_text: 'PBS-01',
    station_category: null,
    supply_source: null,
    bom_classification: null,
    qty_by_model_raw: null,
    source_file: null,
    source_sheet: null,
    source_row_number: null,
    import_line_key: null,
    needs_review: false,
    notes: null,
    raw_data: null,
    is_active: true,
    normalized_part_number: 'Q1',
    part_name_ar: 'مسمار',
    part_name_en: 'Bolt',
    vehicle_model_name: 'T4-PRO L',
    ...overrides
  } as BomItemDetail
}

function row(byModel: Map<string, BomItemDetail>): IplCompareRow {
  return { key: 'bolt', partNameAr: 'مسمار', partNameEn: 'Bolt', byModel }
}

describe('stationGroupsOf', () => {
  it('keeps one group when every fitted model uses the same station', () => {
    const compare = row(
      new Map([
        ['T4-PRO L', item({ id: '1', part_id: 'p1', station_code_text: 'PBS-01' })],
        ['T8C7', item({ id: '2', part_id: 'p1', part_number: 'Q-2', station_code_text: 'PBS-01' })]
      ])
    )
    expect(partFitsMultipleStations(compare, ['T4-PRO L', 'T8C7'])).toBe(false)
    expect(stationGroupsOf(compare, ['T4-PRO L', 'T8C7'])).toHaveLength(1)
  })

  it('splits groups when models land on different stations', () => {
    const compare = row(
      new Map([
        ['T4-PRO L', item({ id: '1', part_id: 'p1', station_code_text: 'PBS-01' })],
        ['T8C7', item({ id: '2', part_id: 'p1', part_number: 'Q-2', station_code_text: 'PBS-12' })]
      ])
    )
    expect(partFitsMultipleStations(compare, ['T4-PRO L', 'T8C7'])).toBe(true)
    const groups = stationGroupsOf(compare, ['T4-PRO L', 'T8C7'])
    expect(groups.map(group => group.stationLabel).sort()).toEqual(['PBS-01', 'PBS-12'])
  })
})

describe('dedupeIplOperationsOnWorker', () => {
  it('keeps one row when the same IPL part was saved once per part number', () => {
    const kept = dedupeIplOperationsOnWorker([
      op('a', iplPartNote('hose', 0, 'PN-1')),
      op('b', iplPartNote('hose', 0, 'PN-2')),
      op('c', iplPartNote('hose', 0, 'PN-3'))
    ])
    expect(kept).toHaveLength(1)
  })

  it('keeps separate copies when the user recorded more than one operation', () => {
    const kept = dedupeIplOperationsOnWorker([
      op('a', iplPartNote('hose', 0)),
      op('b', iplPartNote('hose', 1))
    ])
    expect(kept).toHaveLength(2)
  })
})
