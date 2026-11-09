import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import type { EquipmentKind } from '../../Types/equipmentKind'
import { equipmentKindLabel } from '../../Utils/equipmentKindLabel'

type Props = {
  kinds: EquipmentKind[]
  value: string
  onChange: (code: string) => void
}

type DropdownRect = { top: number; left: number; width: number }

function matchesKind(kind: EquipmentKind, query: string, lang: 'ar' | 'en'): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const label = equipmentKindLabel(kind.code, [kind], lang).toLowerCase()
  return (
    label.includes(q) ||
    kind.labelAr.toLowerCase().includes(q) ||
    kind.labelEn.toLowerCase().includes(q) ||
    kind.manufacturer.toLowerCase().includes(q) ||
    kind.operatingRange.toLowerCase().includes(q) ||
    String(kind.rangeMin ?? '').includes(q) ||
    String(kind.rangeMax ?? '').includes(q) ||
    kind.code.toLowerCase().includes(q)
  )
}

export function EquipmentKindSearch({ kinds, value, onChange }: Props) {
  const { t, lang } = useLang()
  const selected = useMemo(() => kinds.find(k => k.code === value) ?? null, [kinds, value])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  function selectedLabel(kind: EquipmentKind) {
    return equipmentKindLabel(kind.code, kinds, lang)
  }

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  useEffect(() => {
    if (selected) setQuery(selectedLabel(selected))
  }, [selected, lang, kinds])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (boxRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!open) return
    updateRect()
    const onReposition = () => updateRect()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const matches = useMemo(
    () => kinds.filter(k => matchesKind(k, selected ? '' : query, lang)).slice(0, 20),
    [kinds, query, selected, lang]
  )

  function pick(kind: EquipmentKind) {
    onChange(kind.code)
    setQuery(selectedLabel(kind))
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  const showDropdown = open && !selected && rect

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 ltr:right-2 rtl:left-2"
            aria-label={t('common.delete')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <input
          ref={inputRef}
          className={`${inputCls()} ltr:pl-9 ltr:pr-9 rtl:pr-9 rtl:pl-9`}
          value={query}
          placeholder={t('equipment.kindSearchPh')}
          onChange={e => {
            setQuery(e.target.value)
            if (selected) onChange('')
            setOpen(true)
            updateRect()
          }}
          onFocus={() => {
            setOpen(true)
            updateRect()
          }}
          autoComplete="off"
        />
      </div>
      {showDropdown &&
        createPortal(
          <ul
            ref={listRef}
            className="max-h-56 overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl"
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: Math.max(rect.width, 240),
              zIndex: 260
            }}
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">{t('equipment.kindSearchEmpty')}</li>
            ) : (
              matches.map(kind => (
                <li key={kind.code}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-start hover:bg-slate-800"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(kind)}
                  >
                    <span className="font-bold text-slate-100">{selectedLabel(kind)}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500" dir="ltr">
                      {[kind.manufacturer, kind.operatingRange, kind.code].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body
        )}
    </div>
  )
}
