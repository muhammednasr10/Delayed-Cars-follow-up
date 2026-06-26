import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  buildMissingPartSearchSuggestions,
  findMissingPartSearchSuggestions,
  type MissingPartSearchSuggestion
} from '../../Utils/missingPartSearch'
import type { MissingPartDetail } from '../../Types/missingPart'

type Props = {
  items: MissingPartDetail[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const kindTone: Record<MissingPartSearchSuggestion['kind'], string> = {
  vin: 'text-cyan-300',
  part: 'text-amber-200',
  model: 'text-emerald-300'
}

export function MissingPartSearchAutocomplete({ items, value, onChange, placeholder }: Props) {
  const { t } = useLang()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const pool = useMemo(() => buildMissingPartSearchSuggestions(items), [items])
  const matches = useMemo(() => findMissingPartSearchSuggestions(pool, query), [pool, query])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function apply(next: string) {
    setQuery(next)
    onChange(next)
    setOpen(false)
  }

  function onQueryChange(next: string) {
    setQuery(next)
    onChange(next)
    setOpen(true)
  }

  function kindLabel(kind: MissingPartSearchSuggestion['kind']) {
    if (kind === 'vin') return t('mp.search.kindVin')
    if (kind === 'part') return t('mp.search.kindPart')
    return t('mp.search.kindModel')
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
        <input
          className="input-dark ltr:pl-9 rtl:pr-9"
          placeholder={placeholder ?? t('mp.searchPlaceholder')}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && matches.length === 1) {
              e.preventDefault()
              apply(matches[0].value)
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          autoComplete="off"
        />
      </div>

      {open && query.trim().length > 0 && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {matches.map(s => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-slate-800"
                onMouseDown={e => e.preventDefault()}
                onClick={() => apply(s.value)}
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-100" dir={s.kind === 'vin' ? 'ltr' : undefined}>
                    {s.label}
                  </p>
                  {s.sublabel && <p className="truncate text-xs text-slate-500">{s.sublabel}</p>}
                </div>
                <span className={`shrink-0 text-[10px] font-black uppercase ${kindTone[s.kind]}`}>{kindLabel(s.kind)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && matches.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-500 shadow-xl">
          {t('mp.search.noMatches')}
        </div>
      )}
    </div>
  )
}
