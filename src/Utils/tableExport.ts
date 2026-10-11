import type { TableExportColumn, TableExportData } from './tableExportTypes'

export type { TableExportColumn, TableExportData, TableExportSummary } from './tableExportTypes'
export { buildExportData, extractTableData } from './tableExportTypes'

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'export'
}

export type ExcelSheet = {
  name: string
  rows: Array<Array<string | number>>
  /** صفوف العناوين (من صفر). بدونها أول صف في كل جدول يبقى عنوان. */
  headerRows?: number[]
}

function excelSheetName(name: string, used: Set<string>): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet'
  let next = cleaned
  let n = 2
  while (used.has(next)) {
    const suffix = ` ${n}`
    next = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`
    n += 1
  }
  used.add(next)
  return next
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function textUnits(value: string): number {
  let width = 0
  for (const ch of value) width += ch.charCodeAt(0) > 255 ? 1.8 : 1.1
  return width
}

export function excelTableBlocks(rows: Array<Array<string | number>>): { start: number; end: number; width: number }[] {
  const blocks: { start: number; end: number; width: number }[] = []
  let start = -1
  for (let i = 0; i <= rows.length; i += 1) {
    const row = rows[i]
    const empty = i === rows.length || !row || row.every(cell => cell === '' || cell == null)
    if (!empty && start < 0) start = i
    if (empty && start >= 0) {
      let width = 1
      for (let r = start; r < i; r += 1) width = Math.max(width, rows[r]?.length ?? 0)
      blocks.push({ start, end: i - 1, width })
      start = -1
    }
  }
  return blocks
}

function headerRowSet(rows: Array<Array<string | number>>, explicit?: number[]): Set<number> {
  if (explicit) return new Set(explicit)
  return new Set(excelTableBlocks(rows).map(block => block.start))
}

function columnWidths(rows: Array<Array<string | number>>): number[] {
  const blocks = excelTableBlocks(rows)
  const count = blocks.reduce((max, block) => Math.max(max, block.width), 1)
  const widths = Array.from({ length: count }, () => 12)
  for (const block of blocks) {
    for (let r = block.start; r <= block.end; r += 1) {
      const row = rows[r] ?? []
      for (let c = 0; c < block.width; c += 1) {
        const units = textUnits(String(row[c] ?? '')) + 3
        widths[c] = Math.min(46, Math.max(widths[c] ?? 12, units))
      }
    }
  }
  return widths
}

/** 0 = عادي، 1 = قيمة في النص وبحدود، 2 = عنوان بولد. */
const STYLE_BODY = 1
const STYLE_HEADER = 2

export function excelStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`
}

function sharedStringIndex(strings: Map<string, number>, text: string): number {
  const existing = strings.get(text)
  if (existing != null) return existing
  const index = strings.size
  strings.set(text, index)
  return index
}

export function excelSharedStringsXml(strings: Map<string, number>): string {
  const ordered = [...strings.entries()].sort((a, b) => a[1] - b[1]).map(([text]) => text)
  const items = ordered
    .map(text => {
      const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : ''
      return `<si><t${space}>${xmlEscape(text)}</t></si>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ordered.length}" uniqueCount="${ordered.length}">${items}</sst>`
}

function sheetDimension(rows: Array<Array<string | number>>): string {
  const blocks = excelTableBlocks(rows)
  if (blocks.length === 0) return 'A1'
  const lastRow = blocks[blocks.length - 1].end + 1
  const width = blocks.reduce((max, block) => Math.max(max, block.width), 1)
  return `A1:${columnLetter(width - 1)}${lastRow}`
}

export function excelWorksheetXml(sheet: ExcelSheet, strings = new Map<string, number>()): string {
  const rows = sheet.rows.length > 0 ? sheet.rows : [['']]
  const blocks = excelTableBlocks(rows)
  const headers = headerRowSet(rows, sheet.headerRows)
  const widths = columnWidths(rows)
  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width.toFixed(1)}" customWidth="1"/>`)
    .join('')
  const blockAt = (rowIndex: number) => blocks.find(block => rowIndex >= block.start && rowIndex <= block.end)
  const body = rows
    .map((row, rowIndex) => {
      const block = blockAt(rowIndex)
      if (!block) return `<row r="${rowIndex + 1}"/>`
      const style = headers.has(rowIndex) ? STYLE_HEADER : STYLE_BODY
      const cells = Array.from({ length: block.width }, (_, colIndex) => {
        const value = row[colIndex] ?? ''
        const ref = `${columnLetter(colIndex)}${rowIndex + 1}`
        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${ref}" s="${style}"><v>${value}</v></c>`
        }
        const text = String(value)
        if (text === '') return `<c r="${ref}" s="${style}"/>`
        return `<c r="${ref}" t="s" s="${style}"><v>${sharedStringIndex(strings, text)}</v></c>`
      }).join('')
      return `<row r="${rowIndex + 1}" ht="22" customHeight="1">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${sheetDimension(rows)}"/>
  <sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${cols}</cols>
  <sheetData>${body}</sheetData>
</worksheet>`
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const packed = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: packed }
}

function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder()
  const stamp = dosDateTime()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(10, stamp.time, true)
    localView.setUint16(12, stamp.date, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, file.data.length, true)
    localView.setUint32(22, file.data.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(12, stamp.time, true)
    centralView.setUint16(14, stamp.date, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, file.data.length, true)
    centralView.setUint32(24, file.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local, file.data)
    centrals.push(central)
    offset += local.length + file.data.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  const parts = [...locals, ...centrals, end].map(part => new Uint8Array(part))
  return new Blob(parts, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export function buildStyledWorkbook(sheets: ExcelSheet[]): Blob {
  const encoder = new TextEncoder()
  const used = new Set<string>()
  const strings = new Map<string, number>()
  const named = sheets.map((sheet, index) => ({
    sheet,
    file: `xl/worksheets/sheet${index + 1}.xml`,
    name: excelSheetName(sheet.name, used),
    xml: excelWorksheetXml(sheet, strings)
  }))
  const stylesId = named.length + 1
  const stringsId = named.length + 2
  const sheetOverrides = named
    .map(
      item =>
        `<Override PartName="/${item.file}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('')
  const sheetRels = named
    .map(
      (item, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join('')
  const sheetEntries = named
    .map((item, index) => `<sheet name="${xmlEscape(item.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')
  const files = [
    {
      name: '[Content_Types].xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  ${sheetOverrides}
</Types>`
    },
    {
      name: '_rels/.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr/>
  <bookViews><workbookView activeTab="0"/></bookViews>
  <sheets>${sheetEntries}</sheets>
</workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${stringsId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`
    },
    { name: 'xl/styles.xml', text: excelStylesXml() },
    { name: 'xl/sharedStrings.xml', text: excelSharedStringsXml(strings) },
    ...named.map(item => ({ name: item.file, text: item.xml }))
  ]
  return zipStore(files.map(file => ({ name: file.name, data: encoder.encode(file.text) })))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizeFilename(filename)}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportWorkbookToExcel(sheets: ExcelSheet[], filename: string): void {
  if (sheets.length === 0) return
  downloadBlob(buildStyledWorkbook(sheets), filename)
}

export function exportTableToExcel(data: TableExportData, filename: string, sheetName = 'Export'): void {
  if (data.rows.length === 0) return
  const rows: Array<Array<string | number>> = []
  const headerRows: number[] = []
  if (data.summary && data.summary.headers.length > 0) {
    headerRows.push(rows.length)
    rows.push([data.summary.title])
    headerRows.push(rows.length)
    rows.push(data.summary.headers)
    rows.push(data.summary.values)
    rows.push([])
  }
  headerRows.push(rows.length)
  rows.push(data.headers)
  rows.push(...data.rows)
  exportWorkbookToExcel([{ name: sheetName, rows, headerRows }], filename)
}

export async function exportTableToPdf(
  data: TableExportData,
  filename: string,
  title: string,
  rtl = true
): Promise<void> {
  if (data.rows.length === 0) return
  const { renderTablePdf } = await import('./tableExportPdf')
  await renderTablePdf(data, filename, title, rtl)
}
