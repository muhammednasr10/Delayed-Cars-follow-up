import { useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { cell, localDayKey, todayLocalDayKey } from '../../Utils/missingPartPageUtils'
import { ExportableTable } from '../ExportableTable'
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
  parts: string
  qty: number
  reasons: string
  departments: string
  station: string
  followUp: string
  completer: string
  when: string
}

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

function groupVehicles(
  items: MissingPartDetail[],
  dayKey: string,
  field: 'createdAt' | 'shortageResolvedAt',
  reasons: MpLookupOption[],
  departments: MpLookupOption[],
  lang: string
): VehicleDayRow[] {
  const byVehicle = new Map<string, MissingPartDetail[]>()
  for (const item of items) {
    if (localDayKey(item[field]) !== dayKey) continue
    const group = byVehicle.get(item.vehicleId) ?? []
    group.push(item)
    byVehicle.set(item.vehicleId, group)
  }

  return [...byVehicle.values()]
    .map(parts => {
      const first = parts[0]!
      const when = field === 'createdAt' ? first.createdAt : first.shortageResolvedAt
      return {
        vehicleId: first.vehicleId,
        modelName: first.modelName || '—',
        vin: first.vin,
        parts: uniqueJoin(parts.map(part => part.partDescription)),
        qty: parts.reduce((sum, part) => sum + (Number(part.remainingQty) || 0), 0),
        reasons: uniqueJoin(parts.map(part => mpLookupLabel(reasons, part.reason, lang))),
        departments: uniqueJoin(parts.map(part => mpLookupLabel(departments, part.department, lang))),
        station: uniqueJoin(parts.map(part => [part.stationNumber, part.stationName].filter(Boolean).join(' · '))),
        followUp: uniqueJoin(parts.map(part => part.followUpEmployeeNames || part.followUpEmployeeName)),
        completer: uniqueJoin(parts.map(part => part.shortageResolvedByName)),
        when: when ? new Date(when).toLocaleDateString(lang === 'ar' ? 'ar' : 'en') : '—'
      }
    })
    .sort((a, b) => a.modelName.localeCompare(b.modelName, 'ar') || a.vin.localeCompare(b.vin))
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
    () => (mode === 'reportDaily' ? groupVehicles(items, activityDay, 'createdAt', reasons, departments, lang) : []),
    [mode, items, activityDay, reasons, departments, lang]
  )
  const archivedVehicles = useMemo(
    () =>
      mode === 'reportDaily' ? groupVehicles(items, activityDay, 'shortageResolvedAt', reasons, departments, lang) : [],
    [mode, items, activityDay, reasons, departments, lang]
  )

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
        <div className="space-y-8">
          <DailyVehicleTable
            title={t('mp.reportDailyNewTitle')}
            filename={`missing-parts-daily-new-${activityDay}`}
            rows={newVehicles}
            loading={loading}
            canExport={canExport}
            variant="new"
          />
          <DailyVehicleTable
            title={t('mp.reportDailyArchivedTitle')}
            filename={`missing-parts-daily-archived-${activityDay}`}
            rows={archivedVehicles}
            loading={loading}
            canExport={canExport}
            variant="archived"
          />
        </div>
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
  filename,
  rows,
  loading,
  canExport,
  variant
}: {
  title: string
  filename: string
  rows: VehicleDayRow[]
  loading: boolean
  canExport: boolean
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
      <ExportableTable filename={filename} title={title} rowCount={loading ? 0 : rows.length} showExport={canExport}>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[880px] text-center text-sm">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.model')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.vin')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.part')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.qty')}</th>
                {variant === 'new' ? (
                  <>
                    <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.reasonClass')}</th>
                    <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.causingDepartment')}</th>
                    <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.station')}</th>
                  </>
                ) : (
                  <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.completer')}</th>
                )}
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.cols.followUpEmployee')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>
                  {variant === 'archived' ? t('mp.cols.resolvedAt') : t('mp.cols.createdAt')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(row => (
                <tr key={row.vehicleId} className="bg-slate-900/30">
                  <td className={`${cell} font-black text-white`}>{row.modelName}</td>
                  <td className={`${cell} font-mono text-slate-200`} dir="ltr">
                    {row.vin}
                  </td>
                  <td className={cell}>{row.parts}</td>
                  <td className={`${cell} font-black text-cyan-300`}>{row.qty}</td>
                  {variant === 'new' ? (
                    <>
                      <td className={cell}>{row.reasons}</td>
                      <td className={cell}>{row.departments}</td>
                      <td className={cell}>{row.station}</td>
                    </>
                  ) : (
                    <td className={cell}>{row.completer}</td>
                  )}
                  <td className={cell}>{row.followUp}</td>
                  <td className={`${cell} text-slate-300`} dir="ltr">
                    {row.when}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
          {!loading && rows.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
        </div>
      </ExportableTable>
    </section>
  )
}
