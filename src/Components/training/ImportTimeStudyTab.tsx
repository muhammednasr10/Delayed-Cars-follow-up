import { useEffect, useState } from 'react'
import { FileUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { parseSpreadsheetFile } from '../../Utils/parseSpreadsheet'
import { parseTimeStudyRows } from '../../Utils/timeStudyParser'
import { buildImportDiff, runTimeStudyImport, type ImportSummary } from '../../services/importTimeStudyService'
import { getFamilyMembers, setFamilyMembers, getTiggo8FamilyId } from '../../services/modelFamiliesService'
import { getVehicleModels } from '../../services/settingsService'
import type { ParseResult } from '../../Types/timeStudy'
import type { VehicleModel } from '../../Types/settings'

type Step = 'upload' | 'families' | 'preview' | 'diff' | 'done'

type Props = {
  notify: (msg: string, isError?: boolean) => void
  canManage: boolean
  onImported?: () => void
}

export function ImportTimeStudyTab({ notify, canManage, onImported }: Props) {
  const { t } = useLang()

  const [step, setStep] = useState<Step>('upload')
  const [parse, setParse] = useState<ParseResult | null>(null)
  const [diffs, setDiffs] = useState<{ label: string; action: string }[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [tiggo8Members, setTiggo8Members] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace_hardware'>('merge')

  useEffect(() => {
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getTiggo8FamilyId().then(async id => {
      if (!id) return
      const members = await getFamilyMembers(id)
      setTiggo8Members(new Set(members))
    })
  }, [])

  async function onFile(file: File) {
    setBusy(true)
    try {
      const rows = await parseSpreadsheetFile(file)
      const result = parseTimeStudyRows(rows)
      setParse(result)
      setStep('families')
      notify(t('import.parsed', { n: result.operations.length }))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function saveFamilies() {
    const famId = await getTiggo8FamilyId()
    if (!famId) return
    setBusy(true)
    try {
      await setFamilyMembers(famId, [...tiggo8Members])
      notify(t('import.familiesSaved'))
      setStep('preview')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function loadDiff() {
    if (!parse) return
    setBusy(true)
    try {
      const d = await buildImportDiff(parse)
      setDiffs(d)
      setStep('diff')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function confirmImport() {
    if (!parse) return
    setBusy(true)
    try {
      const famId = await getTiggo8FamilyId()
      if (famId) await setFamilyMembers(famId, [...tiggo8Members])
      const sum = await runTimeStudyImport(parse, { mode: importMode, tiggo8ModelIds: [...tiggo8Members] })
      setSummary(sum)
      setStep('done')
      onImported?.()
      notify(t('import.completed'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  if (!canManage) {
    return <div className="card-industrial p-6 text-sm text-amber-300">{t('training.noPerm')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <h3 className="font-black text-white">{t('import.title')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('import.subtitle')}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          {(['upload', 'families', 'preview', 'diff', 'done'] as Step[]).map(s => (
            <span key={s} className={`rounded-lg px-3 py-1 ${step === s ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{t(`import.step.${s}`)}</span>
          ))}
        </div>
      </div>

      {step === 'upload' && (
        <div className="card-industrial flex flex-col items-center gap-4 p-8">
          <FileUp className="h-10 w-10 text-cyan-300" />
          <p className="text-sm text-slate-400">{t('import.formats')}</p>
          <label className="cursor-pointer rounded-xl bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400">
            {busy ? t('common.loading') : t('import.chooseFile')}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          </label>
        </div>
      )}

      {step === 'families' && (
        <div className="card-industrial p-4">
          <h4 className="font-black text-white">{t('import.familyTitle')}</h4>
          <p className="mb-3 text-sm text-slate-400">{t('import.familyHint')}</p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {models.map(m => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-3 py-2 text-sm">
                <input type="checkbox" checked={tiggo8Members.has(m.id)} onChange={e => {
                  setTiggo8Members(prev => { const n = new Set(prev); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n })
                }} />
                <span className="text-slate-200">{m.name}</span>
              </label>
            ))}
          </div>
          <button disabled={busy} onClick={saveFamilies} className="mt-4 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{t('common.next')}</button>
        </div>
      )}

      {step === 'preview' && parse && (
        <div className="card-industrial overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <span className="text-sm text-slate-300">{t('import.previewCount', { stations: parse.stations.length, ops: parse.operations.length })}</span>
            <button disabled={busy} onClick={loadDiff} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950">{t('import.reviewDiff')}</button>
          </div>
          {parse.errors.length > 0 && (
            <div className="border-b border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {parse.errors.slice(0, 5).map(e => <div key={e.row}>Row {e.row}: {e.message}</div>)}
            </div>
          )}
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[900px] text-start text-xs">
              <thead className="bg-slate-950"><tr>
                <th className="table-cell">#</th><th className="table-cell">{t('import.col.station')}</th><th className="table-cell">{t('import.col.operation')}</th>
                <th className="table-cell">{t('import.col.type')}</th><th className="table-cell">{t('import.col.time')}</th><th className="table-cell">{t('import.col.hw')}</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800">
                {parse.operations.slice(0, 100).map(op => (
                  <tr key={`${op.stationCode}-${op.operationNameAr}`}>
                    <td className="table-cell text-slate-500">{op.sequenceNo}</td>
                    <td className="table-cell font-bold text-slate-200" dir="ltr">{op.stationCode}</td>
                    <td className="table-cell text-slate-100">{op.operationNameAr}</td>
                    <td className="table-cell text-slate-400">{op.operationType}</td>
                    <td className="table-cell text-slate-400" dir="ltr">{op.standardTimeMinutes?.toFixed(2) ?? '-'}</td>
                    <td className="table-cell text-slate-400">{op.hardware.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parse.operations.length > 100 && <p className="p-3 text-xs text-slate-500">{t('import.truncated')}</p>}
          </div>
        </div>
      )}

      {step === 'diff' && (
        <div className="card-industrial p-4">
          <h4 className="mb-2 font-black text-white">{t('import.diffTitle')}</h4>
          <p className="mb-3 text-sm text-slate-400">{t('import.diffHint')}</p>
          <select className="input-dark mb-4 max-w-xs" value={importMode} onChange={e => setImportMode(e.target.value as typeof importMode)}>
            <option value="merge">{t('import.modeMerge')}</option>
            <option value="replace_hardware">{t('import.modeReplaceHw')}</option>
          </select>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800">
            {diffs.slice(0, 80).map((d, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-slate-800/80 px-3 py-2 text-xs">
                {d.action === 'create' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                <span className="text-slate-300">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={busy} onClick={() => setStep('preview')} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">{t('common.back')}</button>
            <button disabled={busy} onClick={confirmImport} className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50">{busy ? t('common.saving') : t('import.confirm')}</button>
          </div>
        </div>
      )}

      {step === 'done' && summary && (
        <div className="card-industrial p-4 text-sm text-slate-200">
          <h4 className="font-black text-emerald-300">{t('import.summaryTitle')}</h4>
          <ul className="mt-3 space-y-1">
            <li>{t('import.sum.stations', { c: summary.stationsCreated, u: summary.stationsUpdated })}</li>
            <li>{t('import.sum.operations', { c: summary.operationsCreated, u: summary.operationsUpdated })}</li>
            <li>{t('import.sum.hardware', { n: summary.hardwareRows })}</li>
            <li>{t('import.sum.routes', { n: summary.routesCreated })}</li>
            <li>{t('import.sum.skills', { n: summary.skillsLinked })}</li>
            <li>{t('import.sum.timeStudies', { n: summary.timeStudiesDrafted })}</li>
          </ul>
          {summary.errors.length > 0 && (
            <div className="mt-3 text-xs text-red-300">{summary.errors.slice(0, 10).join(' · ')}</div>
          )}
        </div>
      )}
    </div>
  )
}
