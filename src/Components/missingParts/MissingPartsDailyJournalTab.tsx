import { useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import { ExportableTable } from '../ExportableTable'
import { cell, formatResolvedMonthLabel } from '../../Utils/missingPartPageUtils'
import {
  buildMissingPartDiary,
  diaryDayTotals,
  listDiaryMonthOptions,
  localMonthKey
} from '../../Utils/missingPartDailyJournal'

type Props = {
  items: MissingPartDetail[]
  loading: boolean
  canExport: boolean
}

function weekdayLabel(year: number, month: number, day: number, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { weekday: 'long' }).format(
    new Date(year, month - 1, day)
  )
}

export function MissingPartsDailyJournalTab({ items, loading, canExport }: Props) {
  const { t, lang } = useLang()
  const [monthKey, setMonthKey] = useState(() => localMonthKey(new Date()))
  const monthOptions = useMemo(() => listDiaryMonthOptions(items), [items])
  const rows = useMemo(() => buildMissingPartDiary(items, monthKey), [items, monthKey])
  const totals = useMemo(() => diaryDayTotals(rows), [rows])
  const todayKey = localMonthKey(new Date()) + '-' + String(new Date().getDate()).padStart(2, '0')

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-white">{t('mp.diary.title')}</h3>
          <p className="mt-1 text-xs text-slate-400">{t('mp.diary.hint')}</p>
        </div>
        <label className="flex min-w-[12rem] flex-col gap-1 text-xs font-bold text-slate-400">
          {t('mp.filterMonthLabel')}
          <select
            className="input-dark text-sm font-black text-white"
            value={monthKey}
            onChange={e => setMonthKey(e.target.value)}
          >
            {monthOptions.map(key => (
              <option key={key} value={key}>
                {formatResolvedMonthLabel(key, lang)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ExportableTable
        filename={`missing-parts-diary-${monthKey}`}
        title={t('mp.diary.title')}
        rowCount={loading ? 0 : rows.length}
        showExport={canExport}
      >
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-center">
            <thead className="bg-slate-950/90">
              <tr>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.diary.cols.date')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.diary.cols.opening')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.diary.cols.new')}</th>
                <th className={`${cell} font-black uppercase text-slate-400`}>{t('mp.diary.cols.finished')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(row => {
                const isToday = row.dayKey === todayKey
                return (
                  <tr key={row.dayKey} className={isToday ? 'bg-cyan-500/10' : 'bg-slate-900/30'}>
                    <td className={cell}>
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className={`font-black tabular-nums ${isToday ? 'text-cyan-200' : 'text-white'}`}>
                          {row.day}
                        </span>
                        <span className="text-slate-400">{weekdayLabel(row.year, row.month, row.day, lang)}</span>
                      </span>
                    </td>
                    <td className={`${cell} tabular-nums text-slate-200`}>{row.opening}</td>
                    <td className={`${cell} tabular-nums font-bold text-amber-200`}>{row.newVehicles}</td>
                    <td className={`${cell} tabular-nums font-bold text-emerald-300`}>{row.finished}</td>
                  </tr>
                )
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-950/80">
                  <td className={`${cell} font-black text-slate-300`}>{t('mp.diary.totals')}</td>
                  <td className={`${cell} text-slate-500`}>—</td>
                  <td className={`${cell} tabular-nums font-black text-amber-200`}>{totals.newVehicles}</td>
                  <td className={`${cell} tabular-nums font-black text-emerald-300`}>{totals.finished}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
          {!loading && rows.length === 0 && (
            <div className="p-8 text-center text-slate-400">{t('mp.diary.empty')}</div>
          )}
        </div>
      </ExportableTable>
    </div>
  )
}
