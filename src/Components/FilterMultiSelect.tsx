import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

export type FilterMultiSelectOption = {
  value: string
  label: string
}

type Props = {
  options: FilterMultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  allLabel: string
  selectedCountLabel: (n: number) => string
  clearLabel: string
}

export function FilterMultiSelect({
  options,
  value,
  onChange,
  allLabel,
  selectedCountLabel,
  clearLabel
}: Props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectedSet = useMemo(() => new Set(value), [value])

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return allLabel
    if (value.length === 1) {
      return options.find(o => o.value === value[0])?.label ?? value[0]
    }
    return selectedCountLabel(value.length)
  }, [allLabel, options, selectedCountLabel, value])

  function toggle(optionValue: string) {
    if (selectedSet.has(optionValue)) onChange(value.filter(v => v !== optionValue))
    else onChange([...value, optionValue])
  }

  function clear() {
    onChange([])
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`input-dark flex w-full items-center justify-between gap-2 text-start ${
          value.length > 0 ? 'border-cyan-500/40 text-cyan-100' : ''
        }`}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <span className="flex shrink-0 items-center gap-1">
          {value.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white"
              title={clearLabel}
              onClick={e => {
                e.stopPropagation()
                clear()
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  clear()
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
          <button
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-slate-800 ${
              value.length === 0 ? 'font-black text-cyan-200' : 'text-slate-300'
            }`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              clear()
              setOpen(false)
            }}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                value.length === 0 ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-600'
              }`}
            >
              {value.length === 0 && <Check className="h-3 w-3" />}
            </span>
            {allLabel}
          </button>
          {options.map(opt => {
            const checked = selectedSet.has(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-slate-800 ${
                  checked ? 'text-cyan-100' : 'text-slate-300'
                }`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => toggle(opt.value)}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-600'
                  }`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{opt.label}</span>
              </button>
            )
          })}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">—</p>
          )}
        </div>
      )}
    </div>
  )
}
