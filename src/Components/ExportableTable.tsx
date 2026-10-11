import { useRef, type ReactNode } from 'react'
import { TableExportButtons } from './TableExportButtons'
import type { ExcelSheet, TableExportColumn, TableExportSummary } from '../Utils/tableExport'

type Props<T> = {
  children: ReactNode
  filename: string
  title?: string
  rowCount: number
  columns?: TableExportColumn<T>[]
  rows?: T[]
  summary?: TableExportSummary
  excelSheets?: ExcelSheet[]
  className?: string
  barClassName?: string
  showExport?: boolean
}

export function ExportableTable<T>({
  children,
  filename,
  title,
  rowCount,
  columns,
  rows,
  summary,
  excelSheets,
  className,
  barClassName = 'flex justify-end border-b border-slate-800/70 bg-slate-950/40 px-3 py-2',
  showExport = true
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className={className}>
      {showExport && rowCount > 0 && (
        <div className={barClassName}>
          <TableExportButtons
            containerRef={containerRef}
            filename={filename}
            title={title}
            columns={columns}
            rows={rows}
            summary={summary}
            excelSheets={excelSheets}
          />
        </div>
      )}
      <div ref={containerRef}>{children}</div>
    </div>
  )
}
