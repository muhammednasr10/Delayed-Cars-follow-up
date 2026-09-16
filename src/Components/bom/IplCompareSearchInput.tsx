import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import type { IplSearchSuggestion } from '../../Utils/iplCompareFilters'

type Props = {
  value: string
  onChange: (value: string) => void
  suggestions: IplSearchSuggestion[]
  placeholder?: string
}

type DropdownRect = { top: number; left: number; width: number }

export function IplCompareSearchInput({ value, onChange, suggestions, placeholder }: Props) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const showList = open && value.trim().length > 0

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  useEffect(() => {
    if (!open) return
    updateRect()
    const onScroll = () => updateRect()
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, value, suggestions.length])

  function pick(s: IplSearchSuggestion) {
    onChange(s.query)
    setOpen(false)
  }

  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">{t('bom.search')}</span>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        ref={inputRef}
        className={`${inputCls()} w-full ps-9`}
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? t('bom.iplSmartSearchPh')}
        onFocus={() => {
          setOpen(true)
          updateRect()
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
          updateRect()
        }}
      />
      {showList &&
        rect &&
        createPortal(
          <ul
            className="max-h-64 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl"
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: Math.max(rect.width, 280),
              zIndex: 250
            }}
          >
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">{t('bom.iplSmartSearchEmpty')}</li>
            ) : (
              suggestions.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-start text-sm hover:bg-slate-800"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(s)}
                  >
                    <span className="font-bold text-white">{s.label}</span>
                    {s.secondary ? (
                      <span className="mt-0.5 block text-[10px] text-slate-500" dir="ltr">
                        {s.secondary}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body
        )}
    </label>
  )
}
