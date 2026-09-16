import { describe, expect, it } from 'vitest'
import { buildIplDashboardSummaryFromCompare } from './iplDashboardSummary'
import type { IplCompareRow } from './iplModelCompare'
import type { BomItemDetail } from '../Types/bom'

function item(overrides: Partial<BomItemDetail> & Pick<BomItemDetail, 'id' | 'part_id'>): BomItemDetail {
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
    ...overrides
  } as BomItemDetail
}

describe('buildIplDashboardSummaryFromCompare', () => {
  it('builds model and difference summary tables', () => {
    const models = ['A', 'B']
    const rows: IplCompareRow[] = [
      {
        key: 'ar:1',
        partNameAr: 'جزء ١',
        partNameEn: 'P1',
        byModel: new Map([
          ['A', item({ id: '1', part_id: 'p1', quantity: 1, vehicle_model_name: 'A' })],
          [
            'B',
            item({
              id: '2',
              part_id: 'p1',
              part_number: 'NA',
              quantity: 0,
              source_sheet: 'ipl_not_fitted',
              qty_by_model_raw: 'B=NA',
              vehicle_model_name: 'B'
            })
          ]
        ])
      },
      {
        key: 'ar:2',
        partNameAr: 'جزء ٢',
        partNameEn: 'P2',
        byModel: new Map([
          ['A', item({ id: '3', part_id: 'p2', part_number: 'X1', quantity: 1, vehicle_model_name: 'A' })],
          ['B', item({ id: '4', part_id: 'p2', part_number: 'X2', quantity: 2, vehicle_model_name: 'B' })]
        ])
      }
    ]
    const fitCounts = new Map([
      ['ar:1', { fitted: 1, notFitted: 1, unset: 0 }],
      ['ar:2', { fitted: 2, notFitted: 0, unset: 0 }]
    ])

    const summary = buildIplDashboardSummaryFromCompare(rows, fitCounts, models)
    expect(summary.totalParts).toBe(2)
    expect(summary.fitSummary.mixed).toBe(1)
    expect(summary.fitSummary.allFitted).toBe(1)
    expect(summary.differences.differentPn).toBeGreaterThanOrEqual(1)
    expect(summary.byModel).toHaveLength(2)
    expect(summary.byStation.some(s => s.station.includes('PBS') || s.parts > 0)).toBe(true)
  })
})
