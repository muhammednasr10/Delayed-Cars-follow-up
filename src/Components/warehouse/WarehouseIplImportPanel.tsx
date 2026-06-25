import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, FileUp } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { parseAllSpreadsheetSheets } from '../../Utils/parseSpreadsheet'
import { parseWorkbookIplSheets } from '../../Utils/warehouseIplImportParser'
import { runBomImport, type BomImportProgress } from '../../services/bomImportService'
import type { BomImportSummary } from '../../Types/bom'
import type { VehicleModel } from '../../Types/settings'

type Step = 'idle' | 'preview' | 'done'

type Props = {
  models: VehicleModel[]
  onImported: () => void
  notify: (msg: string, isError?: boolean) => void
}

export function WarehouseIplImportPanel({ models, onImported, notify }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canImport =
    hasRole('admin') ||
    hasPermission('bom', 'import') ||
    hasPermission('bom', 'create') ||
    hasPermission('bom', 'manage')

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<ReturnType<typeof parseWorkbookIplSheets> | null>(null)
  const [busy, setBusy] = useState(false)
  const [importProgress, setImportProgress] = useState<BomImportProgress | null>(null)
  const [summary, setSummary] = useState<BomImportSummary | null>(null)

  if (!canImport) return null

  function phaseLabel(p: BomImportProgress): string {
    if (p.phase === 'parts') return t('bom.importPhaseParts')
    if (p.phase === 'bom') return t('bom.importPhaseBom')
    return t('bom.importPhaseFinish')
  }

  async function onPick(f: File) {
    setFile(f)
    setSummary(null)
    setBusy(true)
    try {
      const sheets = await parseAllSpreadsheetSheets(f)
      const parsed = parseWorkbookIplSheets(sheets, models)
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
    } finally {
      setBusy(false)
    }
  }

  async function confirmImport() {
    if (!file || !workbook?.validation.rows.length) return
    setBusy(true)
    setImportProgress({ phase: 'parts', done: 0, total: workbook.validation.rows.length })
    try {
      const sum = await runBomImport(
        workbook.validation.rows,
        {
          fileName: file.name,
          sheetName: 'ALL',
          sourceFile: file.name
        },
        setImportProgress
      )
      setSummary(sum)
      setStep('done')
      notify(t('warehouses.feeding.iplImportDone'))
      onImported()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
      setImportProgress(null)
    }
  }

  function reset() {
    setStep('idle')
    setFile(null)
    setWorkbook(null)
    setSummary(null)
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
          <p className="text-xs text-cyan-400/80">{t('bom.importT4Hint')}</p>

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

              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-xs">
                {workbook.sheets.map(s => (
                  <div key={s.sheetName} className="flex flex-wrap gap-2 border-b border-slate-800/60 py-1.5 last:border-0">
                    <span className="font-mono text-slate-300" dir="ltr">
                      {s.sheetName}
                    </span>
                    {s.skipped ? (
                      <span className="text-slate-600">{t('warehouses.feeding.iplImportSkipped')}</span>
                    ) : (
                      <>
                        {s.modelHint && (
                          <span className="rounded bg-violet-500/15 px-1.5 text-violet-200" dir="ltr">
                            {s.modelHint}
                          </span>
                        )}
                        <span className="text-slate-500">
                          {t('warehouses.feeding.iplImportRows', { n: s.rowCount })}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {workbook.validation.errors.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  {workbook.validation.errors.slice(0, 15).map((e, i) => (
                    <p key={i}>
                      {t('bom.row')} {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={reset} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300">
                  {t('common.back')}
                </button>
                {busy && importProgress && (
                  <p className="flex-1 self-center text-xs text-cyan-300/90">
                    {t('bom.importProgress', {
                      done: importProgress.done,
                      total: importProgress.total,
                      phase: phaseLabel(importProgress)
                    })}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmImport()}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? t('common.saving') : t('warehouses.feeding.iplImportConfirm')}
                </button>
              </div>
            </>
          )}

          {step === 'done' && summary && (
            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="font-black text-emerald-100">{t('warehouses.feeding.iplImportDone')}</p>
              </div>
              <ul className="text-xs text-emerald-200/90">
                <li>{t('bom.sumParts', { c: summary.createdParts, u: summary.updatedParts })}</li>
                <li>{t('bom.sumBom', { c: summary.createdBomItems, u: summary.updatedBomItems })}</li>
                <li>{t('bom.sumErr', { n: summary.errorsCount })}</li>
              </ul>
              <button type="button" onClick={reset} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
                {t('warehouses.feeding.iplImportAnother')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
