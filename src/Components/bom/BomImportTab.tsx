import { useState, useMemo, useEffect, useCallback } from 'react'
import { FileUp, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import {
  listSpreadsheetSheets,
  parseAllSpreadsheetSheets,
  parseSpreadsheetFile,
  pickDefaultBomSheet
} from '../../Utils/parseSpreadsheet'
import {
  parseBomSpreadsheetRows,
  parseT4SheetOnly
} from '../../Utils/bomImportParser'
import type { BomImportValidation, BomImportImpactEstimate } from '../../Types/bom'
import {
  allStationKeysFromRows,
  filterImportRows,
  groupImportRowsByStation,
  isT4IplSheetName,
  T4_TURBO_MODEL
} from '../../Utils/bomImportFilters'
import { estimateBomImportImpact } from '../../services/bomImportService'
import { BomExcelPreviewTable } from './BomExcelPreviewTable'
import { BomImportStationPreview } from './BomImportStationPreview'
import {
  BomImportDoneCard,
  BomImportErrorList,
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
  const [sheets, setSheets] = useState<string[]>([])
  const [sheet, setSheet] = useState('')
  const [t4SafeMode, setT4SafeMode] = useState(false)
  const [rawValidation, setRawValidation] = useState<BomImportValidation | null>(null)
  const [excludePbs, setExcludePbs] = useState(true)
  const [addOnly, setAddOnly] = useState(true)
  const [t4TurboOnly, setT4TurboOnly] = useState(true)
  const [includedStations, setIncludedStations] = useState<Set<string>>(new Set())
  const [impact, setImpact] = useState<BomImportImpactEstimate | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)

  const includedModels = useMemo(
    () => (t4SafeMode && t4TurboOnly ? [T4_TURBO_MODEL] : undefined),
    [t4SafeMode, t4TurboOnly]
  )

  const filterResult = useMemo(() => {
    if (!rawValidation) return null
    return filterImportRows(rawValidation.rows, {
      excludePbs,
      includedStationKeys: includedStations,
      includedModels
    })
  }, [rawValidation, excludePbs, includedStations, includedModels])

  const filteredRows = filterResult?.rows ?? []
  const stationGroups = useMemo(() => groupImportRowsByStation(filteredRows), [filteredRows])

  const initStationsFromRaw = useCallback(
    (validation: BomImportValidation, pbsExcluded: boolean, turboOnly: boolean) => {
      const { rows } = filterImportRows(validation.rows, {
        excludePbs: pbsExcluded,
        includedModels: turboOnly ? [T4_TURBO_MODEL] : undefined
      })
      setIncludedStations(new Set(allStationKeysFromRows(rows)))
    },
    []
  )

  useEffect(() => {
    if (filteredRows.length === 0) {
      setImpact(null)
      return
    }
    let cancelled = false
    setImpactLoading(true)
    void estimateBomImportImpact(filteredRows)
      .then(est => {
        if (!cancelled) setImpact(est)
      })
      .catch(() => {
        if (!cancelled) setImpact(null)
      })
      .finally(() => {
        if (!cancelled) setImpactLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filteredRows])

  async function onPick(f: File) {
    setFile(f)
    setT4SafeMode(false)
    setImpact(null)
    try {
      const names = await listSpreadsheetSheets(f)
      setSheets(names)
      const allSheets = await parseAllSpreadsheetSheets(f)
      const t4Only = parseT4SheetOnly(allSheets)
      if (t4Only && t4Only.validation.rows.length > 0) {
        setT4SafeMode(true)
        setT4TurboOnly(true)
        setSheet(t4Only.sheetName)
        setRawValidation(t4Only.validation)
        initStationsFromRaw(t4Only.validation, true, true)
        setStep('preview')
        return
      }

      const def = t4Only?.sheetName || pickDefaultBomSheet(names)
      const isT4 = isT4IplSheetName(def)
      setT4SafeMode(isT4)
      setT4TurboOnly(true)
      setSheet(def)
      const validation =
        t4Only?.validation ?? parseBomSpreadsheetRows(await parseSpreadsheetFile(f, def), def)
      setRawValidation(validation)
      initStationsFromRaw(validation, true, isT4)
      setStep('preview')
      if (validation.rows.length === 0) {
        notify(
          t('bom.importNoT4SheetDetail', {
            sheets: names.join('، ')
          }),
          true
        )
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  async function reloadSheet(name: string) {
    if (!file) return
    setSheet(name)
    setT4SafeMode(isT4IplSheetName(name))
    try {
      const validation = parseBomSpreadsheetRows(await parseSpreadsheetFile(file, name), name)
      setRawValidation(validation)
      initStationsFromRaw(validation, excludePbs, isT4IplSheetName(name) && t4TurboOnly)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    }
  }

  function onExcludePbsChange(next: boolean) {
    setExcludePbs(next)
    if (rawValidation) initStationsFromRaw(rawValidation, next, t4SafeMode && t4TurboOnly)
  }

  function onT4TurboOnlyChange(next: boolean) {
    setT4TurboOnly(next)
    if (rawValidation) initStationsFromRaw(rawValidation, excludePbs, t4SafeMode && next)
  }

  function toggleStation(station: string, checked: boolean) {
    setIncludedStations(prev => {
      const next = new Set(prev)
      if (checked) next.add(station)
      else next.delete(station)
      return next
    })
  }

  async function confirm() {
    if (!file || filteredRows.length === 0) return
    const ok = await confirmImport(filteredRows, file, sheet, t('bom.importDone'), { addOnly })
    if (ok) setStep('done')
  }

  if (!canManage) return <div className="card-industrial p-6 text-amber-300">{t('training.noPerm')}</div>

  const previewValidation: BomImportValidation | null = rawValidation
    ? { ...rawValidation, rows: filteredRows, stats: { ...rawValidation.stats, total: filteredRows.length } }
    : null

  return (
    <div className="space-y-4">
      {step === 'upload' && (
        <label className="card-industrial flex cursor-pointer flex-col items-center gap-3 border-dashed p-10 hover:border-cyan-500/50">
          <FileUp className="h-10 w-10 text-cyan-400" />
          <span className="font-black text-white">{t('bom.importTitle')}</span>
          <span className="text-xs text-slate-500">{t('bom.importHint')}</span>
          <span className="text-xs text-cyan-400/90">{t('bom.importT4SafeHint')}</span>
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

      {step === 'preview' && previewValidation && (
        <>
          <div className="card-industrial flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm text-slate-300">{file?.name}</span>
            {t4SafeMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t4TurboOnly ? t('bom.importT4TurboBadge') : t('bom.importT4OnlyBadge')}
              </span>
            )}
            {!t4SafeMode && sheets.length > 1 && (
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
            {t4SafeMode && (
              <span className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-mono text-violet-200" dir="ltr">
                {sheet}
              </span>
            )}
            <span className="text-xs text-slate-500">{bomPreviewStats(previewValidation, t)}</span>
          </div>

          <div className="card-industrial flex flex-wrap gap-4 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={excludePbs}
                onChange={e => onExcludePbsChange(e.target.checked)}
              />
              {t('bom.importExcludePbs')}
              {filterResult && filterResult.excludedPbs > 0 && (
                <span className="text-xs text-amber-300">
                  ({t('bom.importExcludedPbsCount', { n: filterResult.excludedPbs })})
                </span>
              )}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={addOnly}
                onChange={e => setAddOnly(e.target.checked)}
              />
              {t('bom.importAddOnly')}
            </label>
            {t4SafeMode && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={t4TurboOnly}
                  onChange={e => onT4TurboOnlyChange(e.target.checked)}
                />
                {t('bom.importT4TurboOnly')}
                {filterResult && filterResult.excludedNoVariant > 0 && (
                  <span className="text-xs text-amber-300">
                    ({t('bom.importExcludedNoTurboCount', { n: filterResult.excludedNoVariant })})
                  </span>
                )}
              </label>
            )}
          </div>

          {(impact || impactLoading) && addOnly && (
            <div className="card-industrial p-4 text-sm text-slate-300">
              {impactLoading ? (
                <span className="text-slate-500">{t('common.loading')}</span>
              ) : impact ? (
                <ul className="space-y-1 text-xs">
                  <li className="text-emerald-300">
                    {t('bom.importImpactAddBom', { n: impact.toAddBom })}
                  </li>
                  <li className="text-amber-300">
                    {t('bom.importImpactSkipBom', { n: impact.toSkipExistingBom })}
                  </li>
                  <li className="text-cyan-300">
                    {t('bom.importImpactNewParts', { n: impact.toCreateParts })}
                  </li>
                  <li className="text-slate-400">
                    {t('bom.importImpactLinkParts', { n: impact.toLinkExistingParts })}
                  </li>
                </ul>
              ) : null}
            </div>
          )}

          <BomImportStationPreview
            groups={stationGroups}
            included={includedStations}
            onToggle={toggleStation}
            onSelectAll={() => setIncludedStations(new Set(stationGroups.map(g => g.station)))}
            onClearAll={() => setIncludedStations(new Set())}
          />

          <BomImportErrorList errors={previewValidation.errors} rowLabel={t('bom.row')} />
          <BomExcelPreviewTable rows={filteredRows} maxRows={50} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('upload')
                setRawValidation(null)
                setFile(null)
              }}
              className="rounded-xl bg-slate-800 px-4 py-2 font-bold"
            >
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
              disabled={busy || filteredRows.length === 0}
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
