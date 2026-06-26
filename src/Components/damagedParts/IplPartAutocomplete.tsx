import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { searchIplPartsForModel } from '../../services/damagedPartsService'
import type { IplPartHit } from '../../Types/damagedPart'

type Props = {
  modelId: string
  modelName: string
  partNumber: string
  partName: string | null
  onPick: (hit: IplPartHit) => void
  onClear: () => void
  disabled?: boolean
}

type DropdownRect = { top: number; left: number; width: number }

export function IplPartAutocomplete({
  modelId,
  modelName,
  partNumber,
  partName,
  onPick,
  onClear,
  disabled
}: Props) {
  const { t } = useLang()
  const [query, setQuery] = useState(partNumber)
  const [hits, setHits] = useState<IplPartHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setQuery(partNumber)
  }, [partNumber])

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

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  function handleChange(value: string) {
    setQuery(value)
    onClear()
    setOpen(true)
    updateRect()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => void runSearch(value), 200)
  }

  function pick(hit: IplPartHit) {
    setQuery(hit.partNumber)
    setHits([])
    setOpen(false)
    onPick(hit)
  }

  const showDropdown = open && modelId && (loading || hits.length > 0 || query.trim().length > 0)

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={inputCls()}
        value={query}
        disabled={disabled || !modelId}
        placeholder={modelId ? t('damagedParts.partSearchPh') : t('damagedParts.selectModelFirst')}
        onFocus={() => {
          setOpen(true)
          updateRect()
          if (query.trim()) void runSearch(query)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={e => handleChange(e.target.value)}
      />
      {partName && (
        <p className="mt-1 text-xs text-slate-400">{partName}</p>
      )}
      {showDropdown &&
        rect &&
        createPortal(
          <ul
            className="max-h-56 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl"
            style={{ position: 'fixed', top: rect.top, left: rect.left, width: Math.max(rect.width, 280), zIndex: 250 }}
          >
            {loading && <li className="px-3 py-2 text-xs text-slate-500">{t('common.loading')}</li>}
            {!loading && hits.length === 0 && query.trim() && (
              <li className="px-3 py-2 text-xs text-slate-500">{t('damagedParts.noPartMatches')}</li>
            )}
            {hits.map(hit => (
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
          </ul>,
          document.body
        )}
    </div>
  )
}
