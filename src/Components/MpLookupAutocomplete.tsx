import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import type { MpLookupOption } from '../Types/mpLookup'
import { mpLookupLabel } from '../Utils/mpLookupLabel'

type Props = {
  options: MpLookupOption[]
  value: string
  onChange: (code: string) => void
  onCreate?: (labelAr: string) => Promise<MpLookupOption>
  placeholder?: string
  addLabel?: string
  disabled?: boolean
  className?: string
}

type DropdownRect = { top: number; left: number; width: number }

function matchesQuery(opt: MpLookupOption, q: string, lang: string): boolean {
  const label = (lang === 'ar' ? opt.labelAr : opt.labelEn).toLowerCase()
  const other = (lang === 'ar' ? opt.labelEn : opt.labelAr).toLowerCase()
  return label.includes(q) || other.includes(q) || opt.code.toLowerCase().includes(q)
}

export function MpLookupAutocomplete({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  addLabel,
  disabled,
  className
}: Props) {
  const { t, lang } = useLang()
  const selected = useMemo(() => options.find(o => o.code === value) ?? null, [options, value])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  useEffect(() => {
    setQuery(selected ? mpLookupLabel(options, selected.code, lang) : '')
  }, [selected, options, lang])

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
    function onReposition() {
      updateRect()
    }
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return options.slice(0, 40)
    return options.filter(o => matchesQuery(o, q, lang)).slice(0, 40)
  }, [options, q, lang])

  const canCreateFromQuery =
    Boolean(onCreate) &&
    q.length > 0 &&
    !options.some(o => (lang === 'ar' ? o.labelAr : o.labelEn).toLowerCase() === q)

  function pick(opt: MpLookupOption) {
    onChange(opt.code)
    setQuery(mpLookupLabel(options, opt.code, lang) || (lang === 'ar' ? opt.labelAr : opt.labelEn))
    setOpen(false)
    setAdding(false)
  }

  function clear() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  async function createLabel(label: string) {
    if (!onCreate) return
    const trimmed = label.trim()
    if (!trimmed) {
      setError(t('mp.lookupLabelRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const opt = await onCreate(trimmed)
      onChange(opt.code)
      setQuery(lang === 'ar' ? opt.labelAr : opt.labelEn)
      setNewLabel('')
      setAdding(false)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  function onQueryChange(next: string) {
    setQuery(next)
    setOpen(true)
    updateRect()
    if (selected && mpLookupLabel(options, selected.code, lang) !== next.trim()) onChange('')
  }

  const showDropdown = open && !disabled && !adding && rect
  const resolvedAddLabel = addLabel ?? t('mp.addReasonOption')

  return (
    <div className={`space-y-2 ${className ?? ''}`} ref={boxRef}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
          {selected && !adding && (
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 ltr:right-2 rtl:left-2"
              aria-label={t('common.delete')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <input
            ref={inputRef}
            className={`${inputCls()} ltr:pl-9 ltr:pr-9 rtl:pr-9 rtl:pl-9`}
            value={query}
            disabled={disabled || adding}
            placeholder={placeholder ?? t('mp.selectReasonClass')}
            onChange={e => onQueryChange(e.target.value)}
            onFocus={() => {
              if (adding) return
              setOpen(true)
              updateRect()
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (matches.length === 1) pick(matches[0])
                else if (canCreateFromQuery) void createLabel(query)
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            autoComplete="off"
          />
        </div>
        {onCreate && (
          <button
            type="button"
            title={resolvedAddLabel}
            disabled={disabled || saving}
            onClick={() => {
              setAdding(a => !a)
              setOpen(false)
              setError('')
              setNewLabel('')
            }}
            className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {adding && onCreate && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-[10px] font-bold text-slate-500">{resolvedAddLabel}</span>
            <input
              className="input-dark w-full"
              value={newLabel}
              autoFocus
              disabled={saving}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={t('mp.lookupNewPlaceholder')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void createLabel(newLabel)
                }
                if (e.key === 'Escape') {
                  setAdding(false)
                  setNewLabel('')
                  setError('')
                }
              }}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createLabel(newLabel)}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.add')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setAdding(false)
              setNewLabel('')
              setError('')
            }}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}

      {showDropdown &&
        createPortal(
          <div
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
            {matches.map(opt => (
              <button
                key={opt.code}
                type="button"
                className="flex w-full px-3 py-2 text-start text-sm font-bold text-slate-100 hover:bg-slate-800"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                {mpLookupLabel(options, opt.code, lang)}
              </button>
            ))}
            {matches.length === 0 && !canCreateFromQuery && (
              <p className="px-3 py-2 text-xs text-slate-500">{t('mp.search.noMatches')}</p>
            )}
            {canCreateFromQuery && (
              <button
                type="button"
                disabled={saving}
                className="flex w-full items-center gap-2 border-t border-slate-800 px-3 py-2 text-start text-sm font-bold text-cyan-200 hover:bg-slate-800 disabled:opacity-50"
                onMouseDown={e => e.preventDefault()}
                onClick={() => void createLabel(query)}
              >
                <Plus className="h-3.5 w-3.5" />
                {resolvedAddLabel}: «{query.trim()}»
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
