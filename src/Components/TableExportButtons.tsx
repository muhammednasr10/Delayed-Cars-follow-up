import { useState, type RefObject } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import {
  buildExportData,
  exportTableToExcel,
  exportTableToPdf,
  extractTableData,
  type TableExportColumn,
  type TableExportData
} from '../Utils/tableExport'

type Props<T> = {
  filename: string
  title?: string
  containerRef?: RefObject<HTMLElement | null>
  columns?: TableExportColumn<T>[]
  rows?: T[]
  disabled?: boolean
  className?: string
}

export function TableExportButtons<T>({
  filename,
  title,
  containerRef,
  columns,
  rows,
  disabled = false,
  className = ''
}: Props<T>) {
  const { t, lang } = useLang()
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)

  function resolveData(): TableExportData | null {
    if (columns && rows) return buildExportData(rows, columns)
    const table = containerRef?.current?.querySelector('table')
    if (!table) return null
    return extractTableData(table)
  }

  async function run(kind: 'excel' | 'pdf') {
    const data = resolveData()
    if (!data || data.rows.length === 0) return
    setBusy(kind)
    try {
      const exportTitle = title ?? filename
      if (kind === 'excel') exportTableToExcel(data, filename, exportTitle)
      else await exportTableToPdf(data, filename, exportTitle, lang === 'ar')
    } finally {
      setBusy(null)
    }
  }

  const isDisabled = disabled || busy !== null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => void run('excel')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        title={t('export.excel')}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {busy === 'excel' ? t('export.exporting') : t('export.excel')}
      </button>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => void run('pdf')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        title={t('export.pdf')}
      >
        <FileText className="h-4 w-4" />
        {busy === 'pdf' ? t('export.exporting') : t('export.pdf')}
      </button>
    </div>
  )
}
