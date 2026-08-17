import { useLang } from '../../i18n/LanguageContext'
import { todayLocalDayKey } from '../../Utils/missingPartPageUtils'

type Props = {
  dateFrom: string
  dateTo: string
  onChange: (patch: { dateFrom: string; dateTo: string }) => void
}

export function MissingPartsDateFilters({ dateFrom, dateTo, onChange }: Props) {
  const { t } = useLang()
  const todayKey = todayLocalDayKey()
  const todayActive = dateFrom === todayKey && dateTo === todayKey

  return (
    <>
      <label className="flex min-w-[9.5rem] flex-col gap-1">
        <span className="text-xs font-bold text-slate-400">{t('mp.filterDateFrom')}</span>
        <input
          type="date"
          className="input-dark"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={e => {
            const nextFrom = e.target.value
            onChange({
              dateFrom: nextFrom,
              dateTo: dateTo && nextFrom && nextFrom > dateTo ? nextFrom : dateTo
            })
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
            const nextTo = e.target.value
            onChange({
              dateFrom: dateFrom && nextTo && nextTo < dateFrom ? nextTo : dateFrom,
              dateTo: nextTo
            })
          }}
          aria-label={t('mp.filterDateTo')}
        />
      </label>
      <button
        type="button"
        onClick={() => onChange(todayActive ? { dateFrom: '', dateTo: '' } : { dateFrom: todayKey, dateTo: todayKey })}
        className={`mb-0.5 rounded-xl px-3 py-2.5 text-sm font-black ${
          todayActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        {t('mp.filterToday')}
      </button>
    </>
  )
}
