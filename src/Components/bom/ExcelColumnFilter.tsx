import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { getBomDistinctValues, type BomExcelColumnFilters, type BomListFilters } from '../../services/bomService'
import type { BomFilterColumn } from '../../Utils/bomFilterFields'
import { displayBomStationCode } from '../../Utils/bomStationCode'

type Props = {
  column: BomFilterColumn
  label: string
  baseFilters: Omit<BomListFilters, 'page' | 'pageSize'>
  selected: string[] | undefined
  onApply: (values: string[] | undefined) => void
}

export function ExcelColumnFilter({ column, label, baseFilters, selected, onApply }: Props) {
  const { t } = useLang()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)

  const active = Boolean(selected && selected.length > 0)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const excel: BomExcelColumnFilters = { ...baseFilters.excel }
    getBomDistinctValues(column, { ...baseFilters, excel }, { search, excludeColumn: column })
      .then(({ values, truncated: tr }) => {
        setOptions(values)
        setTruncated(tr)
        if (selected && selected.length > 0) {
          setDraft(new Set(selected))
        } else {
          setDraft(new Set(values))
        }
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [open, search, column, baseFilters, selected])

  function openMenu() {
    const el = btnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: Math.max(8, r.left - 180) })
    }
    setSearch('')
    setOpen(true)
  }

  function toggleAll(checked: boolean) {
    setDraft(checked ? new Set(options) : new Set())
  }

  function toggleValue(v: string) {
    setDraft(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  function apply() {
    if (draft.size === 0 || draft.size === options.length) {
      onApply(undefined)
    } else {
      onApply([...draft])
    }
    setOpen(false)
  }

  function clearFilter() {
    onApply(undefined)
    setOpen(false)
  }

  function displayLabel(v: string) {
    if (v === '__BLANK__') return t('bom.excel.blank')
    if (column === 'station_code') return displayBomStationCode(v) || v
    if (column === 'operation') {
      if (v === 'line_stopper') return t('stopper.line_stopper')
      if (v === 'car_stopper') return t('stopper.car_stopper')
      if (v === 'non_stopper') return t('bom.stopperNone')
    }
    return v
  }

  const panel = open ? (
    <div
      className="fixed z-[110] w-72 rounded-xl border border-slate-600 bg-slate-900 shadow-2xl"
      style={{ top: pos.top, left: pos.left }}
      onClick={e => e.stopPropagation()}
    >
      <div className="border-b border-slate-700 p-2">
        <p className="text-[10px] font-black uppercase text-cyan-300">{label}</p>
        <input
          className="input-dark mt-2 w-full text-xs"
          placeholder={t('bom.excel.searchValues')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-1 border-b border-slate-800 px-2 py-1.5">
        <button type="button" className="text-[10px] font-bold text-cyan-400 hover:underline" onClick={() => toggleAll(true)}>
          {t('bom.excel.selectAll')}
        </button>
        <span className="text-slate-600">|</span>
        <button type="button" className="text-[10px] font-bold text-slate-400 hover:underline" onClick={() => toggleAll(false)}>
          {t('bom.excel.clearAll')}
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto p-2">
        {loading ? (
          <p className="text-xs text-slate-500">{t('common.loading')}</p>
        ) : options.length === 0 ? (
          <p className="text-xs text-slate-500">{t('common.noData')}</p>
        ) : (
          options.map(v => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-800">
              <input type="checkbox" checked={draft.has(v)} onChange={() => toggleValue(v)} />
              <span className="truncate text-xs text-slate-200" dir={column.includes('part') || column === 'station_code' ? 'ltr' : undefined}>
                {displayLabel(v)}
              </span>
            </label>
          ))
        )}
        {truncated && <p className="mt-2 text-[10px] text-amber-400">{t('bom.excel.truncated')}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 p-2">
        <button type="button" className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold" onClick={clearFilter}>
          {t('bom.excel.clearFilter')}
        </button>
        <button type="button" className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-black text-slate-950" onClick={apply}>
          {t('common.confirm')}
        </button>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={t('bom.excel.filter')}
        onClick={e => {
          e.stopPropagation()
          if (open) setOpen(false)
          else openMenu()
        }}
        className={`rounded p-0.5 shrink-0 ${active ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
      >
        <Filter className="h-3 w-3" />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[105]" onClick={() => setOpen(false)} />
            {panel}
          </>,
          document.body
        )}
    </>
  )
}
