import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import type { Employee } from '../Types/employee'
import { employeeLookupLabel, findEmployeesByQuery, findExactEmployee } from '../Utils/employeeLookup'

type Props = {
  employees: Employee[]
  value: string
  onChange: (employeeId: string) => void
  activeOnly?: boolean
  placeholder?: string
  /** When true, empty value means "unknown" and can be picked from the list. */
  allowUnknown?: boolean
  unknownLabel?: string
}

type DropdownRect = { top: number; left: number; width: number }

export function EmployeeAutocomplete({
  employees,
  value,
  onChange,
  activeOnly = true,
  placeholder,
  allowUnknown = false,
  unknownLabel
}: Props) {
  const { t } = useLang()
  const pool = useMemo(() => (activeOnly ? employees.filter(e => e.isActive) : employees), [employees, activeOnly])
  const selected = useMemo(() => pool.find(e => e.id === value) ?? null, [pool, value])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const resolvedUnknownLabel = unknownLabel ?? t('common.unknown')

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  useEffect(() => {
    if (selected) setQuery(employeeLookupLabel(selected))
    else if (allowUnknown) setQuery(resolvedUnknownLabel)
    else setQuery('')
  }, [selected, allowUnknown, resolvedUnknownLabel])

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

  const matches = useMemo(() => findEmployeesByQuery(pool, query), [pool, query])

  function pick(employee: Employee) {
    onChange(employee.id)
    setQuery(employeeLookupLabel(employee))
    setOpen(false)
  }

  function pickUnknown() {
    onChange('')
    setQuery(resolvedUnknownLabel)
    setOpen(false)
  }

  function clear() {
    if (allowUnknown) pickUnknown()
    else {
      onChange('')
      setQuery('')
      setOpen(false)
    }
  }

  function tryPickFromQuery() {
    const exact = findExactEmployee(pool, query)
    if (exact) {
      pick(exact)
      return
    }
    if (matches.length === 1) pick(matches[0])
  }

  function onQueryChange(next: string) {
    setQuery(next)
    setOpen(true)
    updateRect()
    if (selected && employeeLookupLabel(selected) !== next.trim()) onChange('')
    else if (allowUnknown && !selected && next.trim() !== resolvedUnknownLabel) onChange('')
  }

  function onFocusInput() {
    if (allowUnknown && !value && query === resolvedUnknownLabel) setQuery('')
    setOpen(true)
    updateRect()
  }

  function onBlurInput() {
    window.setTimeout(() => {
      if (selected) return
      if (allowUnknown && !value) setQuery(resolvedUnknownLabel)
    }, 150)
  }

  const showUnknownSelected = allowUnknown && !value && query === resolvedUnknownLabel
  const showDropdown = open && !selected && (allowUnknown || query.trim().length > 0) && rect

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
          className={`${inputCls()} ltr:pl-9 ltr:pr-9 rtl:pr-9 rtl:pl-9 ${showUnknownSelected ? 'text-slate-400' : ''}`}
          value={query}
          placeholder={placeholder ?? t('manpower.daily.lookupPh')}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={onFocusInput}
          onBlur={onBlurInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              tryPickFromQuery()
            }
          }}
          autoComplete="off"
        />
      </div>

      {showDropdown &&
        createPortal(
          <ul
            ref={listRef}
            className="max-h-48 overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl"
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              zIndex: 260
            }}
          >
            {allowUnknown && (
              <li>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-start text-sm font-bold text-slate-400 hover:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={pickUnknown}
                >
                  {resolvedUnknownLabel}
                </button>
              </li>
            )}
            {query.trim().length > 0 && matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">{t('manpower.daily.noMatches')}</li>
            ) : (
              matches.map(emp => (
                <li key={emp.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-slate-800"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(emp)}
                  >
                    <span className="font-bold text-slate-100">{emp.fullName}</span>
                    <span className="font-mono text-xs text-amber-300" dir="ltr">
                      {emp.employeeCode}
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
