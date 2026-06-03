import { useEffect, useRef, useState } from 'react'
import { MapPin, Plus, Search, X, Loader2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useStationSearch } from '../hooks/useStationSearch'
import { quickCreateStation } from '../services/stationService'
import type { Station } from '../Types/settings'

type Props = {
  value: Station | null
  onSelect: (station: Station | null) => void
  // When true, allow creating a station that does not exist yet.
  canCreate?: boolean
}

// Intelligent searchable station field: type to search existing stations,
// select one to auto-fill its details, or (when permitted) create a new one.
export function StationAutocomplete({ value, onSelect, canCreate = false }: Props) {
  const { t } = useLang()
  const { query, setQuery, results, loading, error } = useStationSearch()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function pick(station: Station) {
    onSelect(station)
    setOpen(false)
    setQuery('')
    setCreateError('')
  }

  function clear() {
    onSelect(null)
    setQuery('')
    setCreateError('')
  }

  async function create() {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    setCreateError('')
    try {
      const station = await quickCreateStation(name)
      pick(station)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  // Selected state: show an auto-filled card with the station details.
  if (value) {
    return (
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-300" />
            <span className="font-black text-slate-100">{value.station_name}</span>
          </div>
          <button type="button" onClick={clear} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title={t('station.clear')}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
          <Meta label={t('station.code')} value={value.station_number} />
          <Meta label={t('station.area')} value={value.work_areas?.name} />
          <Meta label={t('station.line')} value={value.line_name} />
          <Meta label={t('station.department')} value={value.responsible_department ? t(`department.${value.responsible_department}`) : null} />
          <Meta label={t('station.person')} value={value.responsible_person} />
        </dl>
      </div>
    )
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
        <input
          className="input-dark ltr:pl-9 rtl:pr-9"
          value={query}
          placeholder={t('station.search')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('station.searching')}
            </div>
          )}

          {!loading && error && (
            <div className="px-3 py-3 text-sm text-red-300">{error}</div>
          )}

          {!loading && !error && results.length > 0 && results.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-slate-800"
            >
              <span className="font-bold text-slate-100">{s.station_name}</span>
              <span className="text-xs text-slate-400">
                {s.station_number}{s.line_name ? ` · ${s.line_name}` : ''}
              </span>
            </button>
          ))}

          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-3 text-sm">
              {canCreate ? (
                <button type="button" onClick={create} disabled={creating} className="flex w-full items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 font-bold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {t('station.create')}: “{query.trim()}”
                </button>
              ) : (
                <span className="text-amber-300">{t('station.notFound')}</span>
              )}
              {createError && <div className="mt-2 text-red-300">{createError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-1">
      <dt className="text-slate-500">{label}:</dt>
      <dd className="font-semibold text-slate-200">{value}</dd>
    </div>
  )
}
