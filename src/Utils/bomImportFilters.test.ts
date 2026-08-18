import { describe, expect, it } from 'vitest'
import type { ParsedBomRow } from '../Types/bom'
import {
  allStationKeysFromRows,
  filterImportRows,
  groupImportRowsByStation,
  isPbsStationCode,
  isT4IplSheetName
} from './bomImportFilters'

function row(stationCode: string, partNumber = 'PN1'): ParsedBomRow {
  return {
    rowNumber: 1,
    modelFamily: 'T4',
    applicableModels: ['T4T'],
    stationCode,
    stationCategory: '',
    supplySource: 'CKD',
    partNumber,
    partNumberNew: '',
    alternativePartNo: '',
    partNameAr: 'جزء',
    partNameEn: 'Part',
    partKind: 'part',
    bomClassification: 'Common',
    qtyByModelRaw: 'T4T=1',
    qtyByModel: [{ model: 'T4T', qty: 1 }],
    sourceSheet: 'IPL-T4',
    sourceRow: 2,
    importAction: 'upsert',
    raw: {}
  }
}

describe('bomImportFilters', () => {
  it('detects PBS station codes', () => {
    expect(isPbsStationCode('PBS-01')).toBe(true)
    expect(isPbsStationCode('PBS01')).toBe(true)
    expect(isPbsStationCode('ST-01')).toBe(false)
  })

  it('detects T4 IPL sheet names', () => {
    expect(isT4IplSheetName('IPL-T4')).toBe(true)
    expect(isT4IplSheetName('IPL-T7')).toBe(false)
  })

  it('excludes PBS rows when requested', () => {
    const items = [row('ST-01'), row('PBS-01'), row('ST-02')]
    const { rows, excludedPbs } = filterImportRows(items, { excludePbs: true, includedStationKeys: new Set(['ST-01', 'ST-02']) })
    expect(rows).toHaveLength(2)
    expect(excludedPbs).toBe(1)
  })

  it('filters by included stations', () => {
    const items = [row('ST-01'), row('ST-02')]
    const { rows, excludedByStation } = filterImportRows(items, {
      excludePbs: false,
      includedStationKeys: new Set(['ST-01'])
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].stationCode).toBe('ST-01')
    expect(excludedByStation).toBe(1)
  })

  it('groups rows by station', () => {
    const groups = groupImportRowsByStation([row('ST-01'), row('ST-01'), row('ST-02')])
    expect(groups).toHaveLength(2)
    expect(groups.find(g => g.station === 'ST-01')?.count).toBe(2)
  })

  it('keeps only T4 Turbo qty and drops rows without it', () => {
    const turbo = {
      ...row('ST-01'),
      applicableModels: ['T4T', 'T4L', 'T4C'],
      qtyByModelRaw: 'T4T=2; T4L=1; T4C=1'
    }
    const luxuryOnly = {
      ...row('ST-02'),
      applicableModels: ['T4L'],
      qtyByModelRaw: 'T4L=1',
      qtyByModel: [{ model: 'T4L', qty: 1 }]
    }
    const { rows, excludedNoVariant } = filterImportRows([turbo, luxuryOnly], {
      includedModels: ['T4T']
    })
    expect(excludedNoVariant).toBe(1)
    expect(rows).toHaveLength(1)
    expect(rows[0].applicableModels).toEqual(['T4T'])
    expect(rows[0].qtyByModelRaw).toBe('T4T=2')
    expect(rows[0].qtyByModel).toEqual([{ model: 'T4T', qty: 2 }])
  })
})
