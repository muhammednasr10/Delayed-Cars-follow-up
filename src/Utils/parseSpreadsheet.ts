import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function parseSpreadsheetFile(file: File, sheetName?: string): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheet =
      sheetName && wb.SheetNames.includes(sheetName)
        ? wb.Sheets[sheetName]
        : wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
    return rows.map(r => r.map(c => String(c ?? '').trim()))
  }
  const text = await file.text()
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false })
  if (parsed.errors.length > 0) throw new Error(parsed.errors[0]?.message ?? 'CSV parse error')
  return (parsed.data as string[][]).map(r => r.map(c => String(c ?? '').trim()))
}

export async function listSpreadsheetSheets(file: File): Promise<string[]> {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) return ['Sheet1']
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return wb.SheetNames
}

export function pickDefaultBomSheet(sheetNames: string[]): string {
  if (sheetNames.includes('BOM_App_Import')) return 'BOM_App_Import'
  const iplT4 = sheetNames.find(s => /ipl.*t4/i.test(s))
  if (iplT4) return iplT4
  if (sheetNames.includes('BOM')) return 'BOM'
  return sheetNames[0] ?? 'Sheet1'
}

export async function parseAllSpreadsheetSheets(file: File): Promise<{ sheetName: string; rows: string[][] }[]> {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    const rows = await parseSpreadsheetFile(file)
    return [{ sheetName: 'Sheet1', rows }]
  }
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return wb.SheetNames.map(sheetName => {
    const sheet = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
    return { sheetName, rows: rows.map(r => r.map(c => String(c ?? '').trim())) }
  })
}
