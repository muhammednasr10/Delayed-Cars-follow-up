import { describe, expect, it } from 'vitest'
import {
  buildIplSearchSuggestions,
  classifyIplPartFit,
  filterIplCompareRows,
  summarizeIplCompareFit
} from './iplCompareFilters'
import type { IplCompareRow } from './iplModelCompare'
import type { BomItemDetail } from '../Types/bom'

function item(partial: Partial<BomItemDetail> & Pick<BomItemDetail, 'id' | 'part_id'>): BomItemDetail {
  return {
    vehicle_model_id: null,
    station_id: null,
    part_number: 'P1',
    part_name: 'Part',
    quantity: 1,
    side: null,
    position: null,
    model_family: null,
    applicable_models_text: null,
    station_code_text: 'ST-01',
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
    part_length: null,
    part_width: null,
    part_height: null,
    part_volume: null,
    feeding_method: null,
    packing: null,
    part_direction: null,
    rack_code: null,
    rack_size: null,
    rack_length: null,
    rack_width: null,
    rack_height: null,
    carton_qty: null,
    part_weight: null,
    carton_weight: null,
    is_active: true,
    normalized_part_number: 'P1',
    part_name_ar: 'جزء',
    part_name_en: 'Part',
    vehicle_model_name: 'A',
    ...partial
  } as BomItemDetail
}

function row(key: string, ar: string, byModel: Map<string, BomItemDetail>): IplCompareRow {
  return { key, partNameAr: ar, partNameEn: 'Part', byModel }
}

describe('classifyIplPartFit', () => {
  it('classifies exclusive fit states', () => {
    expect(classifyIplPartFit({ fitted: 3, notFitted: 0, unset: 0 }, 3)).toBe('all_fitted')
    expect(classifyIplPartFit({ fitted: 0, notFitted: 3, unset: 0 }, 3)).toBe('all_not_fitted')
    expect(classifyIplPartFit({ fitted: 0, notFitted: 0, unset: 3 }, 3)).toBe('all_unset')
    expect(classifyIplPartFit({ fitted: 1, notFitted: 1, unset: 1 }, 3)).toBe('mixed')
  })
})

describe('summarizeIplCompareFit', () => {
  it('aggregates part classes and model slots', () => {
    const rows = [
      row('a', 'أ', new Map()),
      row('b', 'ب', new Map()),
      row('c', 'ج', new Map())
    ]
    const counts = new Map([
      ['a', { fitted: 2, notFitted: 0, unset: 0 }],
      ['b', { fitted: 0, notFitted: 2, unset: 0 }],
      ['c', { fitted: 1, notFitted: 0, unset: 1 }]
    ])
    expect(summarizeIplCompareFit(rows, counts, 2)).toEqual({
      allFitted: 1,
      allNotFitted: 1,
      allUnset: 0,
      mixed: 1,
      total: 3,
      modelSlotsFitted: 3,
      modelSlotsNotFitted: 2,
      modelSlotsUnset: 1
    })
  })
})

describe('filterIplCompareRows + suggestions', () => {
  const openTabs = ['A', 'B']
  const rows = [
    row(
      'ar:براكت',
      'براكت السقف',
      new Map([
        ['A', item({ id: '1', part_id: 'p1', part_number: '603000028AA', part_name_ar: 'براكت السقف' })],
        ['B', item({ id: '2', part_id: 'p1', part_number: '603000028AA', part_name_ar: 'براكت السقف' })]
      ])
    )
  ]
  const fitCounts = new Map([['ar:براكت', { fitted: 2, notFitted: 0, unset: 0 }]])

  it('filters by search text', () => {
    expect(
      filterIplCompareRows(rows, {
        openTabs,
        search: 'براكت',
        fitFilter: '',
        diffFilter: '',
        fitCountsByKey: fitCounts,
        modelTotal: 2
      })
    ).toHaveLength(1)
    expect(
      filterIplCompareRows(rows, {
        openTabs,
        search: 'xyz',
        fitFilter: '',
        diffFilter: '',
        fitCountsByKey: fitCounts,
        modelTotal: 2
      })
    ).toHaveLength(0)
  })

  it('builds suggestions as the user types', () => {
    const suggestions = buildIplSearchSuggestions(rows, openTabs, 'بر')
    expect(suggestions.some(s => s.label.includes('براكت'))).toBe(true)
    const byPn = buildIplSearchSuggestions(rows, openTabs, '603')
    expect(byPn.some(s => s.query.includes('603'))).toBe(true)
  })
})
