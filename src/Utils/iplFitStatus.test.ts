import { describe, expect, it } from 'vitest'
import { countIplFitForPartAcrossModels, countIplFitStatuses } from './iplFitStatus'
import type { BomItemDetail } from '../Types/bom'

function item(overrides: Partial<BomItemDetail> & Pick<BomItemDetail, 'id' | 'part_id'>): BomItemDetail {
  return {
    vehicle_model_id: null,
    station_id: null,
    part_number: 'ABC-1',
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
    normalized_part_number: 'ABC-1',
    part_name_ar: 'جزء',
    part_name_en: 'Part',
    vehicle_model_name: 'T7-PRO C',
    ...overrides
  } as BomItemDetail
}

describe('countIplFitStatuses', () => {
  it('counts fitted, not fitted, and unset across models', () => {
    const byModel = new Map<string, BomItemDetail | undefined>([
      ['A', item({ id: '1', part_id: 'p1', quantity: 1, vehicle_model_name: 'A' })],
      [
        'B',
        item({
          id: '2',
          part_id: 'p1',
          part_number: 'NA',
          quantity: 0,
          source_sheet: 'ipl_not_fitted',
          vehicle_model_name: 'B'
        })
      ],
      ['C', item({ id: 'pending:x', part_id: 'p1', quantity: 0 })],
      ['D', undefined]
    ])
    expect(countIplFitStatuses(['A', 'B', 'C', 'D'], byModel)).toEqual({
      fitted: 1,
      notFitted: 1,
      unset: 2
    })
  })
})

describe('countIplFitForPartAcrossModels', () => {
  it('counts unset for models with no BOM line even when a few models are fitted', () => {
    const allBom = [
      item({ id: '1', part_id: 'ant', quantity: 2, vehicle_model_name: 'T7-PRO C' }),
      item({ id: '2', part_id: 'ant', quantity: 2, vehicle_model_name: 'T7-PRO L' }),
      item({ id: '3', part_id: 'ant', quantity: 2, vehicle_model_name: 'T7B' })
    ]
    expect(
      countIplFitForPartAcrossModels(
        ['ant'],
        ['T7-PRO C', 'T7-PRO L', 'T7B', 'F10', 'F12', 'K50'],
        allBom
      )
    ).toEqual({ fitted: 3, notFitted: 0, unset: 3 })
  })
})
