export type TableExportColumn<T> = {
  label: string
  value: (row: T) => string | number | null | undefined
}

export type TableExportData = {
  headers: string[]
  rows: string[][]
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export function buildExportData<T>(items: T[], columns: TableExportColumn<T>[]): TableExportData {
  return {
    headers: columns.map(c => c.label),
    rows: items.map(item => columns.map(c => cellText(c.value(item))))
  }
}

export function extractTableData(table: HTMLTableElement): TableExportData {
  const headerCells = [...table.querySelectorAll('thead tr:last-child th')]
  const skipIndexes = new Set<number>()
  const headers: string[] = []

  headerCells.forEach((th, index) => {
    if (th.hasAttribute('data-export-skip')) {
      skipIndexes.add(index)
      return
    }
    headers.push(th.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  })

  const rows: string[][] = []
  for (const tr of table.querySelectorAll('tbody tr')) {
    if (tr.hasAttribute('data-export-skip')) continue
    const cells = [...tr.querySelectorAll('td')]
    const row: string[] = []
    let exportIndex = 0
    cells.forEach((td, index) => {
      if (skipIndexes.has(index) || td.hasAttribute('data-export-skip')) return
      row[exportIndex] = td.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      exportIndex += 1
    })
    if (row.length > 0 && row.some(c => c.length > 0)) rows.push(row)
  }

  return { headers, rows }
}
