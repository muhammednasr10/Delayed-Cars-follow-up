import { useLang } from '../../i18n/LanguageContext'

type StationGroup = { station: string; count: number }

type Props = {
  groups: StationGroup[]
  included: Set<string>
  onToggle: (station: string, checked: boolean) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function BomImportStationPreview({ groups, included, onToggle, onSelectAll, onClearAll }: Props) {
  const { t } = useLang()
  if (groups.length === 0) return null

  return (
    <div className="card-industrial space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-white">{t('bom.importStationPreviewTitle')}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300">
            {t('bom.importStationSelectAll')}
          </button>
          <button type="button" onClick={onClearAll} className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300">
            {t('bom.importStationClearAll')}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">{t('bom.importStationPreviewHint')}</p>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2">
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(g => {
            const checked = included.has(g.station)
            return (
              <label
                key={g.station}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  checked ? 'bg-cyan-500/10 text-cyan-100' : 'bg-slate-900/40 text-slate-500 line-through'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-600"
                  checked={checked}
                  onChange={e => onToggle(g.station, e.target.checked)}
                />
                <span className="font-mono font-bold" dir="ltr">
                  {g.station}
                </span>
                <span className="text-xs text-slate-500">({g.count})</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
