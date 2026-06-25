import { useEffect, useMemo, useRef, useState } from 'react'
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
}

export function EmployeeAutocomplete({ employees, value, onChange, activeOnly = true, placeholder }: Props) {
  const { t } = useLang()
  const pool = useMemo(() => (activeOnly ? employees.filter(e => e.isActive) : employees), [employees, activeOnly])
  const selected = useMemo(() => pool.find(e => e.id === value) ?? null, [pool, value])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected ? employeeLookupLabel(selected) : '')
  }, [selected])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = useMemo(() => findEmployeesByQuery(pool, query), [pool, query])

  function pick(employee: Employee) {
    onChange(employee.id)
    setQuery(employeeLookupLabel(employee))
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
    setOpen(false)
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
    if (selected && employeeLookupLabel(selected) !== next.trim()) onChange('')
  }

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
          className={`${inputCls()} ltr:pl-9 ltr:pr-9 rtl:pr-9 rtl:pl-9`}
          value={query}
          placeholder={placeholder ?? t('manpower.daily.lookupPh')}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              tryPickFromQuery()
            }
          }}
          autoComplete="off"
        />
      </div>

      {open && query.trim().length > 0 && !selected && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {matches.length === 0 ? (
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
        </ul>
      )}
    </div>
  )
}
