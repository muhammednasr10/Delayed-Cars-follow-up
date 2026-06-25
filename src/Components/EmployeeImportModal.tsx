import { useRef, useState } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { bulkCreateEmployees } from '../services/employeesService'
import {
  parseEmployeeImportFile,
  previewRowToInput,
  type EmployeeImportPreviewRow
} from '../Utils/employeeSheetImport'
import type { Employee } from '../Types/employee'
import type { WorkArea } from '../Types/settings'

type Props = {
  open: boolean
  employees: Employee[]
  areas: WorkArea[]
  busy: boolean
  onClose: () => void
  onDone: (imported: number) => void
}

function errLabel(t: (k: string) => string, code: string): string {
  const key = `org.import.err.${code}`
  const msg = t(key)
  return msg === key ? code : msg
}

export function EmployeeImportModal({ open, employees, areas, busy, onClose, onDone }: Props) {
  const { t } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<EmployeeImportPreviewRow[]>([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)

  const existingCodes = new Set(employees.map(e => e.employeeCode.trim().toLowerCase()))
  const validRows = preview.filter(r => r.errors.length === 0)
  const invalidRows = preview.filter(r => r.errors.length > 0)

  async function onFile(file: File | null) {
    if (!file) return
    setParseError('')
    setPreview([])
    try {
      const rows = await parseEmployeeImportFile(file, areas, existingCodes)
      setPreview(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setParseError(msg === 'EMPTY_SHEET' ? t('org.import.err.EMPTY_SHEET') : msg || t('common.error'))
    }
  }

  async function runImport() {
    const inputs = validRows.map(previewRowToInput).filter((x): x is NonNullable<typeof x> => x != null)
    if (inputs.length === 0) return
    setImporting(true)
    setParseError('')
    try {
      const { imported, errors } = await bulkCreateEmployees(inputs)
      if (errors.length > 0) setParseError(errors.slice(0, 5).join('\n'))
      if (imported > 0) {
        onDone(imported)
        setPreview([])
        onClose()
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setPreview([])
    setParseError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('org.import.title')}
      icon={<Upload className="h-5 w-5" />}
      onClose={handleClose}
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <button type="button" disabled={busy || importing} onClick={handleClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || importing || validRows.length === 0}
            onClick={runImport}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {importing ? t('common.saving') : t('org.import.confirm', { n: validRows.length })}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-300">
        <p>{t('org.import.hint')}</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
          <li>{t('org.import.cols')}</li>
          <li>{t('org.import.areas')}</li>
          <li className="text-amber-300/90">{t('org.import.encodingTip')}</li>
        </ul>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={e => {
            void onFile(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/50 px-4 py-8 font-bold text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800/50"
        >
          <FileUp className="h-5 w-5" />
          {t('org.import.chooseFile')}
        </button>

        {parseError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">{parseError}</div>}

        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="font-bold text-white">
              {t('org.import.summary', { ok: validRows.length, bad: invalidRows.length, total: preview.length })}
            </p>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[600px] text-start text-xs">
                <thead className="bg-slate-950/90 sticky top-0">
                  <tr>
                    <th className="table-cell">#</th>
                    <th className="table-cell">{t('org.f.code')}</th>
                    <th className="table-cell">{t('org.f.name')}</th>
                    <th className="table-cell">{t('org.f.role')}</th>
                    <th className="table-cell">{t('org.f.assignmentStatus')}</th>
                    <th className="table-cell">{t('org.f.workArea')}</th>
                    <th className="table-cell">{t('org.import.statusCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {preview.slice(0, 50).map(r => (
                    <tr key={r.rowNum} className={r.errors.length ? 'bg-red-500/5' : ''}>
                      <td className="table-cell text-slate-500">{r.rowNum}</td>
                      <td className="table-cell font-mono text-white" dir="ltr">{r.employeeCode || '—'}</td>
                      <td className="table-cell">{r.fullName || '—'}</td>
                      <td className="table-cell">{r.jobRole ? t(`jobRole.${r.jobRole}`) : r.errors.includes('UNKNOWN_ROLE') ? '?' : '—'}</td>
                      <td className="table-cell">{r.assignmentStatus ? t(`org.assignmentStatus.${r.assignmentStatus}`) : '—'}</td>
                      <td className="table-cell">{r.workAreaName ?? '—'}</td>
                      <td className="table-cell">
                        {r.errors.length === 0
                          ? <span className="text-emerald-400">{t('org.import.ok')}</span>
                          : <span className="text-red-300">{r.errors.map(c => errLabel(t, c)).join(' · ')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 50 && <p className="text-xs text-slate-500">{t('org.import.moreRows', { n: preview.length - 50 })}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
