import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import {
  computeRankedPositionalWeightMinutes,
  operationTimeMinutes,
  type PredecessorCandidate
} from '../../Utils/operationPrecedence'

type Props = {
  candidates: PredecessorCandidate[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

function matchCandidate(c: PredecessorCandidate, q: string): boolean {
  const needle = q.toLowerCase()
  if (c.label.toLowerCase().includes(needle)) return true
  if (c.subtitle?.toLowerCase().includes(needle)) return true
  return false
}

export function OperationPrecedencePicker({ candidates, selectedIds, onChange }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const byId = useMemo(() => new Map(candidates.map(c => [c.id, c])), [candidates])

  const selectedOps = useMemo(
    () => selectedIds.map(id => byId.get(id)).filter((x): x is PredecessorCandidate => Boolean(x)),
    [selectedIds, byId]
  )

  const rankedMinutes = useMemo(
    () => computeRankedPositionalWeightMinutes(selectedIds, candidates),
    [selectedIds, candidates]
  )

  const hits = useMemo(() => {
    const pool = candidates.filter(c => !selectedIds.includes(c.id))
    const q = search.trim()
    if (!q) return pool.slice(0, 12)
    return pool.filter(c => matchCandidate(c, q)).slice(0, 12)
  }, [candidates, selectedIds, search])

  useEffect(() => {
    if (!search.trim()) setOpen(false)
  }, [search])

  function add(id: string) {
    onChange([...new Set([...selectedIds, id])])
    setSearch('')
    setOpen(false)
  }

  function remove(id: string) {
    onChange(selectedIds.filter(x => x !== id))
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-300">{t('operations.predecessorOps')}</span>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputCls()} ps-9`}
            placeholder={t('operations.predecessorSearchPh')}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          />
          {open && search.trim() && hits.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
              {hits.map(op => {
                const min = operationTimeMinutes(op)
                return (
                  <li key={op.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-slate-800"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => add(op.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-slate-100">{op.label}</span>
                        {op.subtitle && (
                          <span className="block truncate font-mono text-[10px] text-slate-500" dir="ltr">
                            {op.subtitle}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-orange-200/90" dir="ltr">
                        {min > 0 ? `${min.toFixed(2)} ${t('operations.minUnit')}` : '—'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {open && search.trim() && hits.length === 0 && (
            <p className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-500">
              {t('operations.predecessorNoHits')}
            </p>
          )}
        </div>
        <span className="block text-xs text-slate-500">{t('operations.predecessorOpsHint')}</span>
      </label>

      {selectedOps.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-violet-500/25 bg-violet-500/5 p-2">
          {selectedOps.map(op => {
            const min = operationTimeMinutes(op)
            return (
              <span
                key={op.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-500/30 bg-slate-900/80 py-1 ps-2.5 pe-1 text-xs"
              >
                <span className="min-w-0 truncate font-bold text-violet-100">{op.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-orange-200/80" dir="ltr">
                  {min > 0 ? `${min.toFixed(2)}${t('operations.minUnit')}` : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => remove(op.id)}
                  className="rounded p-0.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                  title={t('common.delete')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t('operations.predecessorNone')}</p>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-300">{t('operations.cols.rankedWeight')}</span>
        <input
          className="input-dark w-full font-mono"
          readOnly
          value={rankedMinutes != null ? rankedMinutes.toFixed(2) : '—'}
          dir="ltr"
        />
        <span className="block text-xs text-slate-500">{t('operations.rankedWeightAuto')}</span>
      </label>
    </div>
  )
}
