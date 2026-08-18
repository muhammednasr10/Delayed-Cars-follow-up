import { describe, expect, it } from 'vitest'
import { parseIplSheetRows } from './iplImportParser'

describe('parseIplSheetRows T4 Turbo', () => {
  it('reads Part No, الاسم, Part Name (EN), QTY, Type', () => {
    const rows = [
      ['Part No.', 'الاسم', 'Part Name (EN)', 'QTY', 'Type'],
      ['T4-1001', 'مسمار', 'Bolt', '2', 'CKD']
    ]
    const parsed = parseIplSheetRows(rows, 'Sheet1')
    expect(parsed?.rows).toHaveLength(1)
    expect(parsed?.rows[0].partNumber).toBe('T4-1001')
    expect(parsed?.rows[0].partNameAr).toBe('مسمار')
    expect(parsed?.rows[0].partNameEn).toBe('Bolt')
    expect(parsed?.rows[0].qtyByModelRaw).toBe('T4T=2')
    expect(parsed?.rows[0].supplySource).toBe('CKD')
  })

  it('reads qty from QTY when T/L/C columns are missing', () => {
    const rows = [
      ['PART NUMBER', 'ST', 'PART NAME', "Q'TY"],
      ['9900001', 'ST-01', 'Bolt', '2']
    ]
    const parsed = parseIplSheetRows(rows, 'T4-IPL-Turbo')
    expect(parsed?.rows).toHaveLength(1)
    expect(parsed?.rows[0].qtyByModelRaw).toBe('T4T=2')
    expect(parsed?.rows[0].applicableModels).toEqual(['T4T'])
  })

  it('reads T qty from a two-row header', () => {
    const rows = [
      ['PART NUMBER', 'ST', 'QTY', '', ''],
      ['', '', 'T', 'L', 'C'],
      ['9900002', 'ST-02', '3', '0', '0']
    ]
    const parsed = parseIplSheetRows(rows, 'IPL-T4')
    expect(parsed?.rows.length).toBeGreaterThan(0)
    expect(parsed?.rows[0].qtyByModelRaw).toContain('T4T=3')
  })
})
