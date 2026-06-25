import { useMemo, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { formatStationReferenceCode } from '../Utils/stationHierarchy'
import { filterMasterReferenceStations, masterStationCode } from '../Utils/stationMaster'
import { stationTypeLabel } from '../Utils/stationDisplay'
import type { Station, WorkArea } from '../Types/settings'

type Props = {
  open: boolean
  stations: Station[]
  workAreas: WorkArea[]
  excludeCodes?: string[]
  busy?: boolean
  onClose: () => void
  onSelect: (station: Station) => void
}

export function StationPickModal({
  open,
  stations,
  workAreas,
  excludeCodes = [],
  busy,
  onClose,
  onSelect
}: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')

  const excluded = useMemo(() => new Set(excludeCodes.map(c => c.toUpperCase())), [excludeCodes])

  const available = useMemo(() => {
    const masters = filterMasterReferenceStations(stations).filter(
      s => !excluded.has(masterStationCode(s).toUpperCase())
    )
    const q = search.trim().toLowerCase()
    if (!q) return masters
    return masters.filter(s => {
      const area = workAreas.find(a => a.id === s.work_area_id)?.name ?? ''
      return (
        s.station_number.toLowerCase().includes(q) ||
        s.station_name.toLowerCase().includes(q) ||
        area.toLowerCase().includes(q)
      )
    })
  }, [stations, excluded, search, workAreas])

  return (
    <Modal
      open={open}
      title={t('operations.pickStationTitle')}
      icon={<MapPin className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm">
        <p className="text-slate-400">{t('operations.pickStationHint')}</p>

        <label className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="input-dark w-full ps-9"
            placeholder={t('operations.pickStationSearch')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>

        {available.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center text-slate-500">
            {t('operations.pickStationEmpty')}
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {available.map(s => {
              const area = workAreas.find(a => a.id === s.work_area_id)?.name
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelect(s)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-start transition hover:border-cyan-500/40 hover:bg-slate-800/80 disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{s.station_name || '—'}</p>
                        <p className="mt-0.5 font-mono text-xs text-cyan-300" dir="ltr">
                          {formatStationReferenceCode(s.station_number)}
                        </p>
                        {area && <p className="mt-1 text-xs text-slate-500">{area}</p>}
                      </div>
                      <span className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">
                        {stationTypeLabel(t, s.station_type)}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
