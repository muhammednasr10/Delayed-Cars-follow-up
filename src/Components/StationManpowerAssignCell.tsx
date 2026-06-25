import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import {
  employeeLookupLabel,
  findEmployeesByQuery,
  findExactEmployee
} from '../Utils/employeeLookup'
import type { Employee } from '../Types/employee'

type Props = {
  employees: Employee[]
  selectedIds: string[]
  canManage: boolean
  onChange: (ids: string[]) => void
}

export function StationManpowerAssignCell({ employees, selectedIds, canManage, onChange }: Props) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = useMemo(
    () => selectedIds.map(id => employees.find(e => e.id === id)).filter((e): e is Employee => !!e),
    [selectedIds, employees]
  )

  const available = useMemo(
    () => employees.filter(e => !selectedIds.includes(e.id)),
    [employees, selectedIds]
  )

  const matches = useMemo(() => findEmployeesByQuery(available, query), [available, query])
  const preview = useMemo(() => findExactEmployee(available, query), [available, query])

  function addEmployee(employee: Employee) {
    if (selectedIds.includes(employee.id)) {
      setQuery('')
      setOpen(false)
      return
    }
    onChange([...selectedIds, employee.id])
    setQuery('')
    setOpen(false)
  }

  function removeEmployee(employeeId: string) {
    onChange(selectedIds.filter(id => id !== employeeId))
  }

  function tryAddFromQuery() {
    const exact = findExactEmployee(available, query)
    if (exact) {
      addEmployee(exact)
      return
    }
    if (matches.length === 1) addEmployee(matches[0])
  }

  if (!canManage) {
    return (
      <span className="text-sm text-slate-200">
        {selected.length === 0 ? '—' : selected.map(e => employeeLookupLabel(e)).join('، ')}
      </span>
    )
  }

  return (
    <div className="min-w-[280px] space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(emp => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1 text-xs font-bold text-violet-100"
            >
              <span>{emp.fullName}</span>
              <span className="font-mono text-violet-300" dir="ltr">
                ({emp.employeeCode})
              </span>
              <button
                type="button"
                onClick={() => removeEmployee(emp.id)}
                className="rounded p-0.5 text-violet-300 hover:bg-violet-500/25 hover:text-white"
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex gap-1">
          <input
            className={`${inputCls()} flex-1 py-1.5 text-xs`}
            value={query}
            placeholder={t('manpower.daily.lookupPh')}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tryAddFromQuery()
              }
            }}
          />
          <button
            type="button"
            onClick={tryAddFromQuery}
            disabled={!query.trim()}
            className="rounded-lg bg-violet-500/20 px-2 text-violet-200 hover:bg-violet-500/30 disabled:opacity-40"
            title={t('common.add')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {preview && query.trim() && (
          <p className="mt-1 text-xs text-emerald-300">
            <span className="font-mono" dir="ltr">
              {preview.employeeCode}
            </span>
            <span className="mx-1 text-slate-500">↔</span>
            <span>{preview.fullName}</span>
          </p>
        )}

        {open && query.trim() && matches.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">{t('manpower.daily.noMatches')}</p>
        )}

        {open && query.trim() && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-lg">
            {matches.map(emp => (
              <li key={emp.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-xs hover:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => addEmployee(emp)}
                >
                  <span className="font-bold text-slate-100">{emp.fullName}</span>
                  <span className="font-mono text-violet-300" dir="ltr">
                    {emp.employeeCode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500">{t('manpower.daily.lookupHint')}</p>
    </div>
  )
}
