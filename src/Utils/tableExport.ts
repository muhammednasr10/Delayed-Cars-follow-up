import * as XLSX from 'xlsx'
import type { TableExportColumn, TableExportData } from './tableExportTypes'

export type { TableExportColumn, TableExportData, TableExportSummary } from './tableExportTypes'
export { buildExportData, extractTableData } from './tableExportTypes'

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'export'
}

export function exportTableToExcel(data: TableExportData, filename: string, sheetName = 'Export'): void {
  if (data.rows.length === 0) return
  const preamble: Array<Array<string | number>> = []
  if (data.summary && data.summary.headers.length > 0) {
    preamble.push([data.summary.title])
    preamble.push(data.summary.headers)
    preamble.push(data.summary.values)
    preamble.push([])
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([...preamble, data.headers, ...data.rows])
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
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
