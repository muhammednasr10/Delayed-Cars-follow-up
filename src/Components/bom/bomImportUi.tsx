import { useState } from 'react'
import type { BomImportSummary, BomImportValidation, ParsedBomRow } from '../../Types/bom'
import type { BomImportProgress } from '../../services/bomImportService'
import type { IplSheetSummary } from '../../Utils/iplImportParser'
import { runBomImport } from '../../services/bomImportService'

export function bomImportPhaseLabel(
  p: BomImportProgress,
  t: (key: string) => string
): string {
  if (p.phase === 'parts') return t('bom.importPhaseParts')
  if (p.phase === 'bom') return t('bom.importPhaseBom')
  return t('bom.importPhaseFinish')
}

export function useBomImportRunner(notify: (msg: string, isError?: boolean) => void) {
  const [busy, setBusy] = useState(false)
  const [importProgress, setImportProgress] = useState<BomImportProgress | null>(null)
  const [summary, setSummary] = useState<BomImportSummary | null>(null)

  async function confirmImport(
    rows: ParsedBomRow[],
    file: File,
    sheetName: string,
    doneMessage: string
  ): Promise<boolean> {
    if (!rows.length) return false
    setBusy(true)
    setImportProgress({ phase: 'parts', done: 0, total: rows.length })
    try {
      const sum = await runBomImport(
        rows,
        { fileName: file.name, sheetName, sourceFile: file.name },
        setImportProgress
      )
      setSummary(sum)
      notify(doneMessage)
      return true
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error', true)
      return false
    } finally {
      setBusy(false)
      setImportProgress(null)
    }
  }

  function resetSummary() {
    setSummary(null)
  }

  return { busy, importProgress, summary, setSummary, resetSummary, confirmImport }
}

type SheetListProps = {
  sheets: IplSheetSummary[]
  skippedLabel: string
  rowsLabel: (n: number) => string
}

export function BomIplSheetList({ sheets, skippedLabel, rowsLabel }: SheetListProps) {
  return (
    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-xs">
      {sheets.map(s => (
        <div key={s.sheetName} className="flex flex-wrap gap-2 border-b border-slate-800/60 py-1.5 last:border-0">
          <span className="font-mono text-slate-300" dir="ltr">
            {s.sheetName}
          </span>
          {s.skipped ? (
            <span className="text-slate-600">{skippedLabel}</span>
          ) : (
            <span className="text-slate-500">{rowsLabel(s.rowCount)}</span>
          )}
        </div>
      ))}
    </div>
  )
}

type ErrorListProps = {
  errors: BomImportValidation['errors']
  rowLabel: string
  max?: number
  tone?: 'red' | 'amber'
}

export function BomImportErrorList({ errors, rowLabel, max = 30, tone = 'red' }: ErrorListProps) {
  if (errors.length === 0) return null
  const cls =
    tone === 'amber'
      ? 'max-h-28 overflow-y-auto rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200'
      : 'max-h-40 overflow-y-auto rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200'

  return (
    <div className={cls}>
      {errors.slice(0, max).map((e, i) => (
        <p key={i}>
          {rowLabel} {e.row}: {e.message}
        </p>
      ))}
    </div>
  )
}

type DoneProps = {
  summary: BomImportSummary
  title: string
  t: (key: string, vars?: Record<string, number>) => string
  onReset?: () => void
  resetLabel?: string
  compact?: boolean
}

export function BomImportDoneCard({ summary, title, t, onReset, resetLabel, compact }: DoneProps) {
  return (
    <div
      className={
        compact
          ? 'space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'
          : 'card-industrial space-y-2 p-6'
      }
    >
      <p className={`font-black ${compact ? 'text-emerald-100' : 'text-white'}`}>{title}</p>
      <ul className={`text-sm ${compact ? 'text-xs text-emerald-200/90' : 'text-slate-300'}`}>
        <li>{t('bom.sumParts', { c: summary.createdParts, u: summary.updatedParts })}</li>
        <li>{t('bom.sumBom', { c: summary.createdBomItems, u: summary.updatedBomItems })}</li>
        {!compact && <li>{t('bom.sumDup', { n: summary.duplicatePartNumbers })}</li>}
        <li>{t('bom.sumErr', { n: summary.errorsCount })}</li>
      </ul>
      {onReset && resetLabel && (
        <button type="button" onClick={onReset} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
          {resetLabel}
        </button>
      )}
    </div>
  )
}

export function bomPreviewStats(
  validation: BomImportValidation,
  t: (key: string, vars: Record<string, number>) => string
): string {
  return t('bom.previewStats', {
    total: validation.stats.total,
    source: validation.stats.sourceRows ?? validation.stats.total,
    skipped: validation.stats.skippedNoQty ?? 0,
    errors: validation.errors.length,
    dup: validation.stats.duplicateKeys
  })
}
