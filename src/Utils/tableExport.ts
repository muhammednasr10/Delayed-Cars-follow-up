import * as XLSX from 'xlsx'
import type { TableExportColumn, TableExportData } from './tableExportTypes'

export type { TableExportColumn, TableExportData } from './tableExportTypes'
export { buildExportData, extractTableData } from './tableExportTypes'

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'export'
}

export function exportTableToExcel(data: TableExportData, filename: string, sheetName = 'Export'): void {
  if (data.rows.length === 0) return
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows])
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
