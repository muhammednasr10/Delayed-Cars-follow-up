import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { searchPartsForLink } from '../../services/operationPartsService'
import type { StopperExclusionEntry } from '../../services/bomStopperService'
import type { BomStopperType } from '../../Types/engineering'
import { inputCls } from '../FormField'

type Props = {
  stopperType: BomStopperType
  exclusions: StopperExclusionEntry[]
  onChange: (entries: StopperExclusionEntry[]) => void
}

export function BomStopperExclusionsEditor({ stopperType, exclusions, onChange }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<{ id: string; part_number: string; part_name_ar: string | null }[]>([])

  useEffect(() => {
    if (!search.trim()) {
      setHits([])
      return
    }
    const timer = window.setTimeout(() => {
      searchPartsForLink(search)
        .then(setHits)
        .catch(() => setHits([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  if (stopperType === 'non_stopper') return null

  function addPart(p: { id: string; part_number: string; part_name_ar: string | null }) {
    if (exclusions.some(e => e.part_id === p.id)) return
    onChange([
      ...exclusions,
      { part_id: p.id, part_number: p.part_number, part_name_ar: p.part_name_ar }
    ])
    setSearch('')
    setHits([])
  }

  function remove(partId: string) {
    onChange(exclusions.filter(e => e.part_id !== partId))
  }

  const hint =
    stopperType === 'line_stopper'
      ? t('bom.stopperExclusionsEditLineHint')
      : t('bom.stopperExclusionsEditCarHint')

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p className="font-bold text-amber-100">{t('bom.stopperExclusionsEditTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{hint}</p>
        </div>
      </div>

      <div className="relative mb-3">
        <input
          className={inputCls()}
          placeholder={t('bom.stopperExclusionsAdd')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
            {hits.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-start text-sm hover:bg-slate-800"
                  onClick={() => addPart(p)}
                >
                  <span className="font-mono text-cyan-300" dir="ltr">
                    {p.part_number}
                  </span>
                  {p.part_name_ar && <span className="text-slate-400"> — {p.part_name_ar}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {exclusions.length === 0 ? (
        <p className="text-xs text-slate-500">{t('bom.stopperExclusionsListEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {exclusions.map(ex => (
            <li
              key={ex.part_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-100">{ex.part_name_ar || ex.part_number}</p>
                <p className="font-mono text-xs text-cyan-300/90" dir="ltr">
                  {ex.part_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(ex.part_id)}
                className="shrink-0 rounded-lg p-1.5 text-red-300 hover:bg-red-500/10"
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
