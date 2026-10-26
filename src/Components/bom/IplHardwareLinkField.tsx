import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { searchHardwareParts, type PartLookupHit } from '../../services/operationPartsService'

export type LinkedHardwarePart = {
  partNumber: string
  partName: string | null
  qty: number
}

type Props = {
  enabled: boolean
  selected: LinkedHardwarePart[]
  disabled?: boolean
  onEnabledChange: (checked: boolean) => void
  onChange: (parts: LinkedHardwarePart[]) => void
  qtyForPartNumber?: (partNumber: string) => number
}

type DropdownRect = { top: number; left: number; width: number }

export function IplHardwareLinkField({
  enabled,
  selected,
  disabled,
  onEnabledChange,
  onChange,
  qtyForPartNumber
}: Props) {
  const { t } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PartLookupHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)

  useEffect(() => {
    if (!enabled) {
      setQuery('')
      setHits([])
      setOpen(false)
    }
  }, [enabled])

  useEffect(() => {
    const term = query.trim()
    if (!enabled || term.length < 1) {
      setHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = window.setTimeout(() => {
      searchHardwareParts(term, 12)
        .then(results => {
          const taken = new Set(selected.map(part => part.partNumber))
          setHits(results.filter(hit => !taken.has(hit.part_number)))
          setOpen(true)
        })
        .catch(() => {
          setHits([])
          setOpen(true)
        })
        .finally(() => setSearching(false))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [enabled, query, selected])

  function placeMenu() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  function pick(hit: PartLookupHit) {
    if (selected.some(part => part.partNumber === hit.part_number)) return
    const qty = Math.max(1, Math.floor(qtyForPartNumber?.(hit.part_number) ?? 1))
    onChange([...selected, { partNumber: hit.part_number, partName: hit.part_name_ar, qty }])
    setQuery('')
    setHits([])
    setOpen(false)
  }

  const showMenu = open && query.trim().length > 0 && rect != null

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <input
          type="checkbox"
          className="h-4 w-4 accent-cyan-400"
          checked={enabled}
          disabled={disabled}
          onChange={event => onEnabledChange(event.target.checked)}
        />
        {t('bom.partOps.hardwareAsk')}
      </label>
      {enabled ? (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">{t('bom.partOps.hardwareHint')}</p>
          <input
            ref={inputRef}
            className="input-industrial w-full"
            value={query}
            disabled={disabled}
            placeholder={t('bom.partOps.hardwareSearch')}
            onFocus={() => {
              placeMenu()
              if (query.trim()) setOpen(true)
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onChange={event => {
              setQuery(event.target.value)
              placeMenu()
              setOpen(true)
            }}
          />
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selected.map(part => (
                <span
                  key={part.partNumber}
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs"
                >
                  <span className="font-mono font-bold text-cyan-200" dir="ltr">
                    {part.partNumber}
                  </span>
                  {part.partName ? <span className="truncate text-slate-300">{part.partName}</span> : null}
                  <label className="inline-flex items-center gap-1 text-slate-300">
                    <span className="text-[10px] font-bold">{t('bom.partOps.hardwareQty')}</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={disabled}
                      className="w-14 rounded-md border border-slate-600 bg-slate-950 px-1 py-0.5 text-center font-mono text-xs text-cyan-100"
                      value={part.qty}
                      onChange={event => {
                        const qty = Math.max(1, Math.floor(Number(event.target.value) || 1))
                        onChange(selected.map(item => (item.partNumber === part.partNumber ? { ...item, qty } : item)))
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-300"
                    disabled={disabled}
                    onClick={() => onChange(selected.filter(item => item.partNumber !== part.partNumber))}
                    aria-label={t('common.delete')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {showMenu
            ? createPortal(
                <ul
                  className="max-h-56 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl"
                  style={{ position: 'fixed', top: rect.top, left: rect.left, width: Math.max(rect.width, 280), zIndex: 260 }}
                >
                  {searching ? <li className="px-3 py-2 text-xs text-slate-500">{t('common.loading')}</li> : null}
                  {!searching && hits.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-slate-500">{t('bom.partOps.hardwareEmpty')}</li>
                  ) : null}
                  {hits.map(hit => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-start text-sm hover:bg-slate-800"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => pick(hit)}
                      >
                        <span className="font-mono text-cyan-300" dir="ltr">
                          {hit.part_number}
                        </span>
                        {hit.part_name_ar ? <span className="ms-2 text-slate-300">{hit.part_name_ar}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>,
                document.body
              )
            : null}
        </div>
      ) : null}
    </div>
  )
}
