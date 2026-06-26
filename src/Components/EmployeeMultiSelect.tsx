import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import type { Employee } from '../Types/employee'
import { employeeLookupLabel, findEmployeesByQuery, findExactEmployee } from '../Utils/employeeLookup'

type Props = {
  employees: Employee[]
  value: string[]
  onChange: (employeeIds: string[]) => void
  activeOnly?: boolean
  placeholder?: string
}

export function EmployeeMultiSelect({ employees, value, onChange, activeOnly = true, placeholder }: Props) {
  const { t } = useLang()
  const pool = useMemo(() => (activeOnly ? employees.filter(e => e.isActive) : employees), [employees, activeOnly])
  const selected = useMemo(() => pool.filter(e => value.includes(e.id)), [pool, value])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const available = useMemo(() => pool.filter(e => !value.includes(e.id)), [pool, value])
  const matches = useMemo(() => findEmployeesByQuery(available, query), [available, query])

  function add(employee: Employee) {
    onChange([...value, employee.id])
    setQuery('')
    setOpen(false)
  }

  function remove(id: string) {
    onChange(value.filter(v => v !== id))
  }

  function tryPickFromQuery() {
    const exact = findExactEmployee(available, query)
    if (exact) {
      add(exact)
      return
    }
    if (matches.length === 1) add(matches[0])
  }

  return (
    <div className="space-y-2" ref={boxRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(emp => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-100"
            >
              <span>{emp.fullName}</span>
              <span className="font-mono text-[10px] text-cyan-300/80" dir="ltr">
                {emp.employeeCode}
              </span>
              <button
                type="button"
                onClick={() => remove(emp.id)}
                className="rounded p-0.5 text-cyan-300 hover:bg-cyan-500/20"
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
        <input
          className={`${inputCls()} ltr:pl-9 rtl:pr-9`}
          value={query}
          placeholder={placeholder ?? t('missions.selectAssigneesPh')}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
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

      {open && query.trim().length > 0 && (
        <ul className="max-h-48 overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">{t('manpower.daily.noMatches')}</li>
          ) : (
            matches.map(emp => (
              <li key={emp.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => add(emp)}
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

      {selected.length > 0 && (
        <p className="text-[10px] text-slate-500">
          {t('missions.selectedCount', { n: selected.length })}
        </p>
      )}
    </div>
  )
}
