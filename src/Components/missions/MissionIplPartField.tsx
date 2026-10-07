import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { searchIplPartsForModel } from '../../services/damagedPartsService'
import type { IplPartHit } from '../../Types/damagedPart'
import type { MissionIplPart } from '../../Types/mission'

type Props = {
  modelId: string
  modelName: string
  parts: MissionIplPart[]
  onChange: (parts: MissionIplPart[]) => void
}

export function MissionIplPartField({ modelId, modelName, parts, onChange }: Props) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<IplPartHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)

  const runSearch = useCallback(
    async (term: string) => {
      if (!modelId || term.trim().length < 1) {
        setHits([])
        return
      }
      setLoading(true)
      try {
        setHits(await searchIplPartsForModel(modelId, modelName, term, 20))
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    },
    [modelId, modelName]
  )

  useEffect(() => {
    setQuery('')
    setHits([])
    setOpen(false)
  }, [modelId])

  function pick(hit: IplPartHit) {
    if (!parts.some(part => part.partId === hit.partId)) {
      onChange([...parts, { partId: hit.partId, partNumber: hit.partNumber, partName: hit.partName }])
    }
    setQuery('')
    setHits([])
    setOpen(false)
  }

  const visibleHits = hits.filter(hit => !parts.some(part => part.partId === hit.partId))

  return (
    <div className="space-y-2">
      {parts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {parts.map(part => (
            <span
              key={part.partId}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100"
            >
              <span className="font-mono" dir="ltr">
                {part.partNumber}
              </span>
              {part.partName && <span className="truncate text-slate-300">{part.partName}</span>}
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => onChange(parts.filter(item => item.partId !== part.partId))}
                aria-label={t('common.delete')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          className={inputCls()}
          value={query}
          disabled={!modelId}
          placeholder={modelId ? t('missions.iplPartSearch') : t('missions.iplSelectModelFirst')}
          onFocus={() => {
            setOpen(true)
            if (query.trim()) void runSearch(query)
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={e => {
            const value = e.target.value
            setQuery(value)
            setOpen(true)
            if (debounceRef.current) window.clearTimeout(debounceRef.current)
            debounceRef.current = window.setTimeout(() => void runSearch(value), 200)
          }}
        />
        {open && modelId && query.trim() && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl">
            {loading && <li className="px-3 py-2 text-xs text-slate-500">{t('common.loading')}</li>}
            {!loading && visibleHits.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-500">{t('missions.iplNoMatches')}</li>
            )}
            {visibleHits.map(hit => (
              <li key={hit.partId}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-start text-sm hover:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(hit)}
                >
                  <span className="font-mono text-cyan-300" dir="ltr">
                    {hit.partNumber}
                  </span>
                  {hit.partName && <span className="ms-2 text-slate-300">{hit.partName}</span>}
                  {hit.stationCode && (
                    <span className="mt-0.5 block text-[10px] text-slate-500" dir="ltr">
                      {hit.stationCode}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
