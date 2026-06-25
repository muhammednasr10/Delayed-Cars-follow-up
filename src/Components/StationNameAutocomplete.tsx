import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { formatStationReferenceCode } from '../Utils/stationHierarchy'
import { filterMasterReferenceStations, masterStationCode } from '../Utils/stationMaster'
import type { Station, WorkArea } from '../Types/settings'

type Props = {
  value: string
  onChange: (code: string) => void
  onPick: (station: Station) => void
  stations: Station[]
  workAreas?: Pick<WorkArea, 'id' | 'name'>[]
  excludeCodes?: string[]
  disabled?: boolean
  error?: string
  placeholder?: string
}

export function StationNameAutocomplete({
  value,
  onChange,
  onPick,
  stations,
  workAreas = [],
  excludeCodes = [],
  disabled,
  error,
  placeholder
}: Props) {
  const { t } = useLang()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const excluded = useMemo(() => new Set(excludeCodes.map(c => c.toUpperCase())), [excludeCodes])

  const options = useMemo(() => {
    const masters = filterMasterReferenceStations(stations)
      .filter(s => !excluded.has(masterStationCode(s).toUpperCase()))
      .sort((a, b) => {
        const sa = a.sort_order ?? 0
        const sb = b.sort_order ?? 0
        if (sa !== sb) return sa - sb
        return a.station_number.localeCompare(b.station_number, undefined, { numeric: true })
      })
    const q = value.trim().toLowerCase()
    if (!q) return masters
    return masters.filter(s => {
      const code = formatStationReferenceCode(s.station_number).toLowerCase()
      const raw = s.station_number.toLowerCase()
      const area = workAreas.find(a => a.id === s.work_area_id)?.name?.toLowerCase() ?? ''
      return (
        code.includes(q) ||
        raw.includes(q) ||
        s.station_name.toLowerCase().includes(q) ||
        area.includes(q)
      )
    })
  }, [stations, excluded, value, workAreas])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [value, options.length])

  function pick(station: Station) {
    onPick(station)
    onChange(formatStationReferenceCode(station.station_number))
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(i => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(i => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter' && options[highlight]) {
      e.preventDefault()
      pick(options[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={`input-dark w-full font-mono ${error ? 'border-red-500/60' : ''}`}
        value={value}
        placeholder={placeholder ?? t('operations.stationAutocompletePh')}
        dir="ltr"
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && !disabled && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">{t('operations.stationAutocompleteEmpty')}</li>
          ) : (
            options.map((s, i) => {
              const area = workAreas.find(a => a.id === s.work_area_id)?.name
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-start text-sm hover:bg-slate-800 ${
                      i === highlight ? 'bg-slate-800' : ''
                    }`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(s)}
                  >
                    <span className="font-mono font-bold text-cyan-300" dir="ltr">
                      {formatStationReferenceCode(s.station_number)}
                    </span>
                    <span className="text-slate-300"> — {s.station_name}</span>
                    {area && <span className="block text-[10px] text-slate-500">{area}</span>}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
      {error && <span className="mt-1 block text-xs font-semibold text-red-400">{error}</span>}
    </div>
  )
}
