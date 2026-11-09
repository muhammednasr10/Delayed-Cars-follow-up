import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { getStations } from '../../services/settingsService'
import {
  buildWorkerLineOptions,
  workerLineOptionLabel,
  type WorkerLineOption
} from '../../Utils/workerLineOptions'
import { inputCls } from '../FormField'

type Props = {
  value: string
  onChange: (commonName: string) => void
}

export function WorkerLineCommonNameSelect({ value, onChange }: Props) {
  const { t } = useLang()
  const [options, setOptions] = useState<WorkerLineOption[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getStations()
      .then(stations => {
        if (!cancelled) setOptions(buildWorkerLineOptions(stations))
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = useMemo(
    () => options.find(o => o.commonName === value.trim()) ?? null,
    [options, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 30)
    return options
      .filter(
        o =>
          o.commonName.toLowerCase().includes(q) ||
          o.displayCode.toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [options, query])

  useEffect(() => {
    if (selected) setQuery(workerLineOptionLabel(selected))
    else if (!value.trim()) setQuery('')
    else setQuery(value)
  }, [selected, value])

  if (loading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>
  }

  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        {t('equipment.workerCommonNameEmpty')}
      </p>
    )
  }

  return (
    <div className="relative">
      <input
        className={inputCls()}
        value={query}
        placeholder={t('equipment.workerCommonNamePh')}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value.trim()) onChange('')
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 py-1 shadow-xl">
          {filtered.map(option => (
            <li key={option.stationId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-slate-800"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onChange(option.commonName)
                  setQuery(workerLineOptionLabel(option))
                  setOpen(false)
                }}
              >
                <span className="font-bold text-slate-100">{option.commonName}</span>
                <span className="font-mono text-xs text-slate-400" dir="ltr">
                  {option.displayCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-500">{t('equipment.workerCommonNameHint')}</p>
    </div>
  )
}
