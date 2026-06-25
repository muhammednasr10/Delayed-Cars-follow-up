import { useLang } from '../i18n/LanguageContext'
import type { Station } from '../Types/settings'

type Props = {
  stations: Station[]
  value: Station | null
  onSelect: (station: Station | null) => void
  loading?: boolean
  className?: string
}

export function StationSelect({ stations, value, onSelect, loading, className = 'input-dark' }: Props) {
  const { t } = useLang()

  if (loading) {
    return <p className="text-sm text-slate-500">{t('common.loading')}</p>
  }

  if (stations.length === 0) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
        {t('mp.noStationsInSettings')}
      </p>
    )
  }

  return (
    <select
      className={className}
      value={value?.id ?? ''}
      onChange={e => {
        const st = stations.find(s => s.id === e.target.value) ?? null
        onSelect(st)
      }}
    >
      <option value="">{t('mp.selectStation')}</option>
      {stations.map(s => (
        <option key={s.id} value={s.id}>
          {s.station_number} — {s.station_name}
        </option>
      ))}
    </select>
  )
}
