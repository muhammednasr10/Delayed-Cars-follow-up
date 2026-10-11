import { useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { cell, isOpenShortageLine, localDayKey, todayLocalDayKey } from '../../Utils/missingPartPageUtils'
import { summarizeCausingDepartments } from '../../Utils/missingPartDailyReportExcel'
import { formatVehicleColorLabel } from '../../Utils/vehicleColorLabel'
import { ExportableTable } from '../ExportableTable'
import type { ExcelSheet, TableExportColumn } from '../../Utils/tableExport'
import type { ReportView } from './MissingPartsToolbar'

type Props = {
  mode: ReportView
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  loading: boolean
  canExport: boolean
}

type VehicleDayRow = {
  vehicleId: string
  modelName: string
  vin: string
  color: string
  parts: string
  reasons: string
}

type DailyExportLine =
  | { kind: 'section'; title: string }
  | { kind: 'row'; row: VehicleDayRow }

function shiftDayKey(dayKey: string, delta: number): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(year || 1970, (month || 1) - 1, day || 1)
  date.setDate(date.getDate() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDayKey(dayKey: string, lang: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return dayKey
  return new Date(year, month - 1, day).toLocaleDateString(lang === 'ar' ? 'ar' : 'en')
}

function uniqueJoin(values: Array<string | null | undefined>): string {
  const seen = new Set<string>()
  for (const value of values) {
    const text = value?.trim()
    if (text) seen.add(text)
  }
  return seen.size > 0 ? [...seen].join(' · ') : '—'
}

function groupListed(items: MissingPartDetail[], reasons: MpLookupOption[], lang: string): VehicleDayRow[] {
  const byVehicle = new Map<string, MissingPartDetail[]>()
  for (const item of items) {
    const group = byVehicle.get(item.vehicleId) ?? []
    group.push(item)
    byVehicle.set(item.vehicleId, group)
  }

  return [...byVehicle.values()]
    .map(parts => {
      const first = parts[0]!
      return {
        vehicleId: first.vehicleId,
        modelName: first.modelName || '—',
        vin: first.vin,
        color: uniqueJoin(parts.map(part => formatVehicleColorLabel(part.colorName, part.colorCode))),
        parts: uniqueJoin(parts.map(part => part.partDescription)),
        reasons: uniqueJoin(parts.map(part => mpLookupLabel(reasons, part.reason, lang)))
      }
    })
    .sort((a, b) => a.modelName.localeCompare(b.modelName, 'ar') || a.vin.localeCompare(b.vin))
}

function groupVehicles(
  items: MissingPartDetail[],
  dayKey: string,
  field: 'createdAt' | 'shortageResolvedAt',
  reasons: MpLookupOption[],
  lang: string
): VehicleDayRow[] {
  return groupListed(
    items.filter(item => localDayKey(item[field]) === dayKey),
    reasons,
    lang
  )
}

function vehicleSheetRows(rows: VehicleDayRow[]): Array<Array<string | number>> {
  return rows.map(row => [row.modelName, row.vin, row.color, row.parts, row.reasons])
}

export function MissingPartsReportTab({ mode, items, reasons, departments, loading, canExport }: Props) {
  const { t, lang } = useLang()
  const [day, setDay] = useState(todayLocalDayKey)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const activityDay = shiftDayKey(day, -1)

  const rangeReady = mode !== 'reportCustom' || Boolean(dateFrom || dateTo)

  const rows = useMemo(() => {
    if (mode === 'reportDaily') return []
    const scoped = items.filter(item => {
      const key = localDayKey(item.createdAt)
      if (!key) return false
      if (mode === 'reportCustom') {
        if (!dateFrom && !dateTo) return false
        if (dateFrom && key < dateFrom) return false
        if (dateTo && key > dateTo) return false
      }
      return true
    })
    return scoped.sort(
      (a, b) =>
        a.modelName.localeCompare(b.modelName, 'ar') ||
        a.vin.localeCompare(b.vin) ||
        a.partDescription.localeCompare(b.partDescription, 'ar')
    )
  }, [items, mode, dateFrom, dateTo])

  const newVehicles = useMemo(
    () => (mode === 'reportDaily' ? groupVehicles(items, activityDay, 'createdAt', reasons, lang) : []),
    [mode, items, activityDay, reasons, lang]
  )
  const archivedVehicles = useMemo(
    () => (mode === 'reportDaily' ? groupVehicles(items, activityDay, 'shortageResolvedAt', reasons, lang) : []),
    [mode, items, activityDay, reasons, lang]
  )
  const currentVehicles = useMemo(
    () => (mode === 'reportDaily' ? groupListed(items.filter(isOpenShortageLine), reasons, lang) : []),
    [mode, items, reasons, lang]
  )
  const dailyExcelSheets = useMemo<ExcelSheet[]>(() => {
    if (mode !== 'reportDaily') return []
    const detailHeader = [
      t('mp.cols.model'),
      t('mp.cols.vin'),
      t('mp.cols.color'),
      t('mp.cols.reason'),
      t('mp.cols.reasonClass')
    ]
    const openLines = items.filter(isOpenShortageLine)
    const summary = summarizeCausingDepartments(
      openLines.map(line => ({
        vehicleId: line.vehicleId,
        modelName: line.modelName || '—',
        department: mpLookupLabel(departments, line.department, lang)
      }))
    )
    const vehicleCount = t('mp.reportDailySheets.vehicleCount')
    const lineCount = t('mp.reportDailySheets.lineCount')
    return [
      {
        name: t('mp.reportDailySheets.summary'),
        rows: [
          [t('mp.cols.causingDepartment'), vehicleCount, lineCount],
          ...summary.byDepartment.map(row => [row.department, row.vehicles, row.lines]),
          [],
          [t('mp.cols.model'), t('mp.cols.causingDepartment'), vehicleCount, lineCount],
          ...summary.byModel.map(row => [row.model, row.department, row.vehicles, row.lines])
        ]
      },
      {
        name: t('mp.reportDailySheets.new'),
        rows: [detailHeader, ...vehicleSheetRows(newVehicles)]
      },
      {
        name: t('mp.reportDailySheets.completed'),
        rows: [detailHeader, ...vehicleSheetRows(archivedVehicles)]
      },
      {
        name: t('mp.reportDailySheets.current'),
        rows: [detailHeader, ...vehicleSheetRows(currentVehicles)]
      }
    ]
  }, [mode, items, departments, reasons, lang, t, newVehicles, archivedVehicles, currentVehicles])

  const dailyExportColumns = useMemo<TableExportColumn<DailyExportLine>[]>(
    () => [
      {
        label: t('mp.cols.model'),
        value: line => (line.kind === 'section' ? line.title : line.row.modelName)
      },
      { label: t('mp.cols.vin'), value: line => (line.kind === 'section' ? '' : line.row.vin) },
      { label: t('mp.cols.color'), value: line => (line.kind === 'section' ? '' : line.row.color) },
      { label: t('mp.cols.reason'), value: line => (line.kind === 'section' ? '' : line.row.parts) },
      { label: t('mp.cols.reasonClass'), value: line => (line.kind === 'section' ? '' : line.row.reasons) }
    ],
    [t]
  )
  const dailyExportRows = useMemo<DailyExportLine[]>(() => {
    if (mode !== 'reportDaily') return []
    return [
      { kind: 'section', title: t('mp.reportDailyNewTitle') },
      ...newVehicles.map(row => ({ kind: 'row' as const, row })),
      { kind: 'section', title: t('mp.reportDailyArchivedTitle') },
      ...archivedVehicles.map(row => ({ kind: 'row' as const, row }))
    ]
  }, [mode, newVehicles, archivedVehicles, t])

  const vehicleCount = useMemo(() => new Set(rows.map(row => row.vehicleId)).size, [rows])
  const titleKey =
    mode === 'reportDaily' ? 'mp.tabs.reportDaily' : mode === 'reportCustom' ? 'mp.tabs.reportCustom' : 'mp.tabs.reportList'
  const hintKey =
    mode === 'reportDaily' ? 'mp.reportDailyHint' : mode === 'reportCustom' ? 'mp.reportCustomHint' : 'mp.reportHint'

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-white">{t(titleKey)}</h3>
          <p className="mt-1 text-xs text-slate-400">{t(hintKey)}</p>
          {mode === 'reportDaily' && !loading && (
            <p className="mt-2 text-sm font-black text-cyan-200">
              {t('mp.reportDailyFor', { date: formatDayKey(activityDay, lang) })}
            </p>
          )}
          {mode !== 'reportDaily' && !loading && rangeReady && (
            <p className="mt-2 text-sm font-black text-cyan-200">
              {t('mp.summary.vehicles')}: {vehicleCount} · {t('mp.summary.lines')}: {rows.length}
            </p>
          )}
        </div>

        {mode === 'reportDaily' && (
          <label className="flex min-w-[9.5rem] flex-col gap-1">
            <span className="text-xs font-bold text-slate-400">{t('mp.reportDailyPick')}</span>
            <input
              type="date"
              className="input-dark"
              value={day}
              onChange={e => setDay(e.target.value || todayLocalDayKey())}
              aria-label={t('mp.reportDailyPick')}
            />
          </label>
        )}

        {mode === 'reportCustom' && (
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[9.5rem] flex-col gap-1">
              <span className="text-xs font-bold text-slate-400">{t('mp.filterDateFrom')}</span>
              <input
                type="date"
                className="input-dark"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={e => {
                  const next = e.target.value
                  setDateFrom(next)
                  if (dateTo && next && next > dateTo) setDateTo(next)
                }}
                aria-label={t('mp.filterDateFrom')}
              />
            </label>
            <label className="flex min-w-[9.5rem] flex-col gap-1">
              <span className="text-xs font-bold text-slate-400">{t('mp.filterDateTo')}</span>
              <input
                type="date"
                className="input-dark"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={e => {
                  const next = e.target.value
                  setDateTo(next)
                  if (dateFrom && next && next < dateFrom) setDateFrom(next)
                }}
                aria-label={t('mp.filterDateTo')}
              />
            </label>
          </div>
        )}
      </div>

      {mode === 'reportDaily' ? (
        <ExportableTable
          filename={`missing-parts-daily-${activityDay}`}
          title={t('mp.tabs.reportDaily')}
          rowCount={loading ? 0 : newVehicles.length + archivedVehicles.length + currentVehicles.length}
          showExport={canExport}
          columns={dailyExportColumns}
          rows={dailyExportRows}
          excelSheets={dailyExcelSheets}
        >
          <div className="space-y-8">
            <DailyVehicleTable title={t('mp.reportDailyNewTitle')} rows={newVehicles} loading={loading} variant="new" />
            <DailyVehicleTable
              title={t('mp.reportDailyArchivedTitle')}
              rows={archivedVehicles}
              loading={loading}
              variant="archived"
            />
          </div>
        </ExportableTable>
      ) : (
        <ExportableTable
          filename={mode === 'reportCustom' ? 'missing-parts-custom' : 'missing-parts-report'}
          title={t(titleKey)}
          rowCount={loading || !rangeReady ? 0 : rows.length}
          showExport={canExport}
        >
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[960px] text-center text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.model')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.vin')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.part')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.qty')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.reasonClass')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.causingDepartment')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.station')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.followUpEmployee')}</th>
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.createdAt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rangeReady &&
                  rows.map(row => (
                    <tr key={row.id} className="bg-slate-900/30">
                      <td className={`${cell} font-black text-white`}>{row.modelName || '—'}</td>
                      <td className={`${cell} font-mono text-slate-200`} dir="ltr">
                        {row.vin}
                      </td>
                      <td className={cell}>{row.partDescription || '—'}</td>
                      <td className={`${cell} font-black text-cyan-300`}>{row.remainingQty}</td>
                      <td className={cell}>{mpLookupLabel(reasons, row.reason, lang)}</td>
                      <td className={cell}>{mpLookupLabel(departments, row.department, lang)}</td>
                      <td className={cell}>{[row.stationNumber, row.stationName].filter(Boolean).join(' · ') || '—'}</td>
                      <td className={cell}>{row.followUpEmployeeNames || row.followUpEmployeeName || '—'}</td>
                      <td className={`${cell} text-slate-300`} dir="ltr">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString(lang === 'ar' ? 'ar' : 'en') : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
            {!loading && !rangeReady && <p className="p-8 text-center text-slate-500">{t('mp.reportCustomEmpty')}</p>}
            {!loading && rangeReady && rows.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
          </div>
        </ExportableTable>
      )}
    </div>
  )
}

function DailyVehicleTable({
  title,
  rows,
  loading,
  variant
}: {
  title: string
  rows: VehicleDayRow[]
  loading: boolean
  variant: 'new' | 'archived'
}) {
  const { t } = useLang()

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-black text-white">{title}</h4>
        {!loading && (
          <p className={`text-sm font-black ${variant === 'archived' ? 'text-emerald-300' : 'text-amber-200'}`}>
            {t('mp.summary.vehicles')}: {rows.length}
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[720px] text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.model')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.vin')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.color')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.reason')}</th>
              <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.reasonClass')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(row => (
              <tr key={row.vehicleId} className="bg-slate-900/30">
                <td className={`${cell} font-black text-white`}>{row.modelName}</td>
                <td className={`${cell} font-mono text-slate-200`} dir="ltr">
                  {row.vin}
                </td>
                <td className={cell}>{row.color}</td>
                <td className={cell}>{row.parts}</td>
                <td className={cell}>{row.reasons}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
        {!loading && rows.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
      </div>
    </section>
  )
}
