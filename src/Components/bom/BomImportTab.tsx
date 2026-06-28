import { useState } from 'react'
import { FileUp, CheckCircle2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import {
  listSpreadsheetSheets,
  parseAllSpreadsheetSheets,
  parseSpreadsheetFile,
  pickDefaultBomSheet
} from '../../Utils/parseSpreadsheet'
import { parseBomSpreadsheetRows, parseWorkbookIplSheets, isIplMasterWorkbook } from '../../Utils/bomImportParser'
import type { BomImportValidation } from '../../Types/bom'
import { BomExcelPreviewTable } from './BomExcelPreviewTable'
import {
  BomImportDoneCard,
  BomImportErrorList,
  BomIplSheetList,
  bomImportPhaseLabel,
  bomPreviewStats,
  useBomImportRunner
} from './bomImportUi'

type Step = 'upload' | 'preview' | 'done'

export function BomImportTab({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canManage = hasRole('admin') || hasPermission('bom', 'import')
  const { busy, importProgress, summary, confirmImport } = useBomImportRunner(notify)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [workbookMode, setWorkbookMode] = useState(false)
  const [sheets, setSheets] = useState<string[]>([])
  const [sheet, setSheet] = useState('')
  const [workbookSheets, setWorkbookSheets] = useState<ReturnType<typeof parseWorkbookIplSheets>['sheets'] | null>(
    null
  )
  const [validation, setValidation] = useState<BomImportValidation | null>(null)

  async function onPick(f: File) {
    setFile(f)
    setWorkbookSheets(null)
    try {
      const names = await listSpreadsheetSheets(f)
      setSheets(names)

      if (isIplMasterWorkbook(names)) {
        const parsed = parseWorkbookIplSheets(await parseAllSpreadsheetSheets(f))
        if (parsed.validation.rows.length === 0) {
          notify(t('warehouses.feeding.iplImportNoRows'), true)
          return
        }
        setWorkbookMode(true)
        setWorkbookSheets(parsed.sheets)
        setValidation(parsed.validation)
        setSheet('ALL')
        setStep('preview')
        return
      }

      const def = pickDefaultBomSheet(names)
      setWorkbookMode(false)
      setSheet(def)
      setValidation(parseBomSpreadsheetRows(await parseSpreadsheetFile(f, def), def))
      setStep('preview')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function reloadSheet(name: string) {
    if (!file || workbookMode) return
    setSheet(name)
    try {
      setValidation(parseBomSpreadsheetRows(await parseSpreadsheetFile(file, name), name))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function confirm() {
    if (!file || !validation?.rows.length) return
    const ok = await confirmImport(validation.rows, file, workbookMode ? 'ALL' : sheet, t('bom.importDone'))
    if (ok) setStep('done')
  }

  if (!canManage) return <div className="card-industrial p-6 text-amber-300">{t('training.noPerm')}</div>

  const activeSheets = workbookSheets?.filter(s => !s.skipped) ?? []

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <label className="card-industrial flex cursor-pointer flex-col items-center gap-3 border-dashed p-10 hover:border-cyan-500/50">
          <FileUp className="h-10 w-10 text-cyan-400" />
          <span className="font-black text-white">{t('bom.importTitle')}</span>
          <span className="text-xs text-slate-500">{t('bom.importHint')}</span>
          <span className="text-xs text-cyan-400/90">{t('bom.importIplMasterHint')}</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={busy}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) void onPick(f)
            }}
          />
        </label>
      )}

      {step === 'preview' && validation && (
        <>
          <div className="card-industrial flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm text-slate-300">{file?.name}</span>
            {workbookMode ? (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-200">
                {t('warehouses.feeding.iplImportSheetCount', { n: activeSheets.length })}
              </span>
            ) : (
              <select
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm"
                value={sheet}
                onChange={e => void reloadSheet(e.target.value)}
              >
                {sheets.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-slate-500">{bomPreviewStats(validation, t)}</span>
          </div>

          {workbookMode && workbookSheets && (
            <BomIplSheetList
              sheets={workbookSheets}
              skippedLabel={t('warehouses.feeding.iplImportSkipped')}
              rowsLabel={n => t('warehouses.feeding.iplImportRows', { n })}
            />
          )}

          <BomImportErrorList errors={validation.errors} rowLabel={t('bom.row')} />
          <BomExcelPreviewTable rows={validation.rows} maxRows={50} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('upload')} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
              {t('common.back')}
            </button>
            {busy && importProgress && (
              <p className="flex-1 text-xs text-cyan-300/90">
                {t('bom.importProgress', {
                  done: importProgress.done,
                  total: importProgress.total,
                  phase: bomImportPhaseLabel(importProgress, t)
                })}
              </p>
            )}
            <button
              type="button"
              disabled={busy || validation.rows.length === 0}
              onClick={() => void confirm()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('bom.confirmImport')}
            </button>
          </div>
        </>
      )}

      {step === 'done' && summary && (
        <div className="card-industrial space-y-2 p-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <BomImportDoneCard summary={summary} title={t('bom.importDone')} t={t} />
        </div>
      )}
    </div>
  )
}
