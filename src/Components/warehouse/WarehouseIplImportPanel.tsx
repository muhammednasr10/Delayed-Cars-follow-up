import { useState } from 'react'
import { ChevronDown, ChevronUp, FileUp } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { parseAllSpreadsheetSheets } from '../../Utils/parseSpreadsheet'
import { parseWorkbookIplSheets } from '../../Utils/bomImportParser'
import {
  BomImportDoneCard,
  BomImportErrorList,
  BomIplSheetList,
  bomImportPhaseLabel,
  useBomImportRunner
} from '../bom/bomImportUi'

type Step = 'idle' | 'preview' | 'done'

type Props = {
  onImported: () => void
  notify: (msg: string, isError?: boolean) => void
}

export function WarehouseIplImportPanel({ onImported, notify }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canImport =
    hasRole('admin') ||
    hasPermission('bom', 'import') ||
    hasPermission('bom', 'create') ||
    hasPermission('bom', 'manage')

  const { busy, importProgress, summary, resetSummary, confirmImport } = useBomImportRunner(notify)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<ReturnType<typeof parseWorkbookIplSheets> | null>(null)

  if (!canImport) return null

  async function onPick(f: File) {
    setFile(f)
    resetSummary()
    try {
      const parsed = parseWorkbookIplSheets(await parseAllSpreadsheetSheets(f))
      if (parsed.validation.rows.length === 0) {
        notify(t('warehouses.feeding.iplImportNoRows'), true)
        setStep('idle')
        setWorkbook(null)
        return
      }
      setWorkbook(parsed)
      setStep('preview')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function confirm() {
    if (!file || !workbook?.validation.rows.length) return
    const ok = await confirmImport(
      workbook.validation.rows,
      file,
      'ALL',
      t('warehouses.feeding.iplImportDone')
    )
    if (ok) {
      setStep('done')
      onImported()
    }
  }

  function reset() {
    setStep('idle')
    setFile(null)
    setWorkbook(null)
    resetSummary()
  }

  const activeSheets = workbook?.sheets.filter(s => !s.skipped) ?? []

  return (
    <div className="card-industrial overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-start hover:bg-slate-800/40"
      >
        <FileUp className="h-4 w-4 shrink-0 text-cyan-300" />
        <span className="flex-1 text-sm font-black text-white">{t('warehouses.feeding.iplImportTitle')}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-800 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-400">{t('warehouses.feeding.iplImportHint')}</p>
          <p className="text-xs text-cyan-400/80">{t('bom.importIplMasterHint')}</p>

          {step === 'idle' && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 hover:border-cyan-500/40">
              <FileUp className="h-8 w-8 text-cyan-400" />
              <span className="text-sm font-bold text-slate-200">{t('warehouses.feeding.iplImportPick')}</span>
              <span className="text-xs text-slate-500">.xlsx, .xls, .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={busy}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void onPick(f)
                  e.target.value = ''
                }}
              />
            </label>
          )}

          {step === 'preview' && workbook && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span>{file?.name}</span>
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-200">
                  {t('warehouses.feeding.iplImportSheetCount', { n: activeSheets.length })}
                </span>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-bold text-cyan-200">
                  {t('warehouses.feeding.iplImportPartCount', { n: workbook.validation.rows.length })}
                </span>
              </div>

              <BomIplSheetList
                sheets={workbook.sheets}
                skippedLabel={t('warehouses.feeding.iplImportSkipped')}
                rowsLabel={n => t('warehouses.feeding.iplImportRows', { n })}
              />

              <BomImportErrorList
                errors={workbook.validation.errors}
                rowLabel={t('bom.row')}
                max={15}
                tone="amber"
              />

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={reset} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300">
                  {t('common.back')}
                </button>
                {busy && importProgress && (
                  <p className="flex-1 self-center text-xs text-cyan-300/90">
                    {t('bom.importProgress', {
                      done: importProgress.done,
                      total: importProgress.total,
                      phase: bomImportPhaseLabel(importProgress, t)
                    })}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirm()}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? t('common.saving') : t('warehouses.feeding.iplImportConfirm')}
                </button>
              </div>
            </>
          )}

          {step === 'done' && summary && (
            <BomImportDoneCard
              compact
              summary={summary}
              title={t('warehouses.feeding.iplImportDone')}
              t={t}
              onReset={reset}
              resetLabel={t('warehouses.feeding.iplImportAnother')}
            />
          )}
        </div>
      )}
    </div>
  )
}
