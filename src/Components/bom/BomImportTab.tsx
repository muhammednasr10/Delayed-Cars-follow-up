import { useState } from 'react'
import { FileUp, CheckCircle2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { parseSpreadsheetFile, listSpreadsheetSheets, pickDefaultBomSheet } from '../../Utils/parseSpreadsheet'
import { parseBomSpreadsheetRows } from '../../Utils/bomImportParser'
import { runBomImport } from '../../services/bomImportService'
import type { BomImportSummary, BomImportValidation } from '../../Types/bom'
import { BomExcelPreviewTable } from './BomExcelPreviewTable'

type Step = 'upload' | 'preview' | 'done'

export function BomImportTab({ notify }: { notify: (m: string, err?: boolean) => void }) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canManage = hasRole('admin') || hasPermission('bom', 'import')
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [sheet, setSheet] = useState('')
  const [validation, setValidation] = useState<BomImportValidation | null>(null)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<BomImportSummary | null>(null)

  async function onPick(f: File) {
    setFile(f)
    setBusy(true)
    try {
      const names = await listSpreadsheetSheets(f)
      setSheets(names)
      const def = pickDefaultBomSheet(names)
      setSheet(def)
      const rows = await parseSpreadsheetFile(f, def)
      setValidation(parseBomSpreadsheetRows(rows))
      setStep('preview')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function reloadSheet(name: string) {
    if (!file) return
    setSheet(name)
    setBusy(true)
    try {
      const rows = await parseSpreadsheetFile(file, name)
      setValidation(parseBomSpreadsheetRows(rows))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!file || !validation?.rows.length) return
    setBusy(true)
    try {
      const sum = await runBomImport(validation.rows, {
        fileName: file.name,
        sheetName: sheet,
        sourceFile: file.name
      })
      setSummary(sum)
      setStep('done')
      notify(t('bom.importDone'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  if (!canManage) return <div className="card-industrial p-6 text-amber-300">{t('training.noPerm')}</div>

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <label className="card-industrial flex cursor-pointer flex-col items-center gap-3 border-dashed p-10 hover:border-cyan-500/50">
          <FileUp className="h-10 w-10 text-cyan-400" />
          <span className="font-black text-white">{t('bom.importTitle')}</span>
          <span className="text-xs text-slate-500">{t('bom.importHint')}</span>
          <span className="text-xs text-cyan-400/90">{t('bom.importT4Hint')}</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
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
            <select className="rounded-lg bg-slate-900 px-3 py-2 text-sm" value={sheet} onChange={e => void reloadSheet(e.target.value)}>
              {sheets.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {t('bom.previewStats', {
                total: validation.stats.total,
                errors: validation.errors.length,
                dup: validation.stats.duplicateKeys
              })}
            </span>
          </div>
          {validation.errors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {validation.errors.slice(0, 30).map((e, i) => (
                <p key={i}>
                  {t('bom.row')} {e.row}: {e.message}
                </p>
              ))}
            </div>
          )}
          <BomExcelPreviewTable rows={validation.rows} maxRows={50} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('upload')} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
              {t('common.back')}
            </button>
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
          <p className="font-black text-white">{t('bom.importDone')}</p>
          <ul className="text-sm text-slate-300">
            <li>{t('bom.sumParts', { c: summary.createdParts, u: summary.updatedParts })}</li>
            <li>{t('bom.sumBom', { c: summary.createdBomItems, u: summary.updatedBomItems })}</li>
            <li>{t('bom.sumDup', { n: summary.duplicatePartNumbers })}</li>
            <li>{t('bom.sumErr', { n: summary.errorsCount })}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
