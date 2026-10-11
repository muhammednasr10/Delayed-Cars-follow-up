import { describe, expect, it } from 'vitest'
import { excelStylesXml, excelTableBlocks, excelWorksheetXml, type ExcelSheet } from './tableExport'

describe('excel worksheet layout', () => {
  const sheet: ExcelSheet = {
    name: 'النواقص الجديدة',
    rows: [
      ['الموديل', 'رقم الشاسيه', 'السبب'],
      ['T4-PRO C', '2710', 'بدون لوكر ابواب']
    ]
  }

  it('treats the first row of each block as a table', () => {
    expect(excelTableBlocks([['عنوان'], ['صف'], [], ['عنوان تاني'], [1]])).toEqual([
      { start: 0, end: 1, width: 1 },
      { start: 3, end: 4, width: 1 }
    ])
  })

  it('centers values, draws borders, and bolds the header', () => {
    const xml = excelWorksheetXml(sheet)
    const styles = excelStylesXml()
    expect(xml).toContain('s="2"')
    expect(xml).toContain('s="1"')
    expect(xml).not.toContain('s="0"')
    expect(xml).toContain('t="s"')
    expect(xml).toContain('customWidth="1"')
    expect(xml).toContain('rightToLeft="1"')
    expect(styles).toContain('horizontal="center"')
    expect(styles).toContain('style="thin"')
    expect(styles).toContain('<b/>')
  })
})
