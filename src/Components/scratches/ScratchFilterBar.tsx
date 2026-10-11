import { useMemo } from 'react'
import { Field, inputCls } from '../FormField'
import { IplCompareSearchInput } from '../bom/IplCompareSearchInput'
import { useLang } from '../../i18n/LanguageContext'
import type { ScratchRecord, ScratchSeverity } from '../../Types/scratch'
import {
  EMPTY_SCRATCH_FILTER,
  buildScratchSearchSuggestions,
  hasActiveScratchFilters,
  scratchMatchesFilter,
  type ScratchListFilter
} from '../../Utils/scratchFilters'

type Props = {
  items: ScratchRecord[]
  filter: ScratchListFilter
  onChange: (filter: ScratchListFilter) => void
  shownCount: number
}

const SEVERITIES: ScratchSeverity[] = ['light', 'medium', 'severe']

export function ScratchFilterBar({ items, filter, onChange, shownCount }: Props) {
  const { t } = useLang()
  const narrowed = useMemo(
    () =>
      items.filter(row =>
        scratchMatchesFilter(row, { ...filter, search: '' }, { severity: '', willStop: '' })
      ),
    [items, filter]
  )
  const suggestions = useMemo(() => {
    const words = filter.search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const last = words[words.length - 1] ?? ''
    const labels = [
      ...SEVERITIES.map(key => ({
        id: `sev-${key}`,
        label: t(`scratches.severity.${key}`),
        query: t(`scratches.severity.${key}`)
      })),
      { id: 'stop-yes', label: t('scratches.willStop.yes'), query: t('scratches.willStop.yes') },
      { id: 'stop-no', label: t('scratches.willStop.no'), query: t('scratches.willStop.no') }
    ].filter(item => last && item.label.toLowerCase().includes(last))
    return [...labels, ...buildScratchSearchSuggestions(narrowed, filter.search)].slice(0, 8)
  }, [narrowed, filter.search, t])
  const parents = useMemo(() => {
    const source = items.filter(row =>
      scratchMatchesFilter(row, { ...filter, search: '', parent: '' }, { severity: '', willStop: '' })
    )
    return [...new Set(source.map(row => row.parentModelName).filter((name): name is string => Boolean(name)))].sort()
  }, [items, filter])
  const variants = useMemo(() => {
    const source = items.filter(row =>
      scratchMatchesFilter(row, { ...filter, search: '', variant: '' }, { severity: '', willStop: '' })
    )
    return [...new Set(source.map(row => row.modelName).filter((name): name is string => Boolean(name)))].sort()
  }, [items, filter])

  function patch(next: Partial<ScratchListFilter>) {
    const merged = { ...filter, ...next }
    if (next.parent !== undefined && next.parent !== filter.parent && merged.variant) {
      const source = next.parent ? items.filter(row => row.parentModelName === next.parent) : items
      if (!source.some(row => row.modelName === merged.variant)) merged.variant = ''
    }
    onChange(merged)
  }

  return (
    <div className="card-industrial space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
        <div className="block space-y-1.5 lg:col-span-2">
          <span className="text-sm font-bold text-slate-300">{t('scratches.filters.search')}</span>
          <IplCompareSearchInput
            value={filter.search}
            onChange={search => patch({ search })}
            suggestions={suggestions}
            placeholder={t('scratches.filters.searchPh')}
          />
        </div>
        <Field label={t('scratches.cols.parentModel')}>
          <select className={inputCls()} value={filter.parent} onChange={e => patch({ parent: e.target.value })}>
            <option value="">{t('common.all')}</option>
            {parents.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('scratches.cols.variant')}>
          <select className={inputCls()} value={filter.variant} onChange={e => patch({ variant: e.target.value })}>
            <option value="">{t('common.all')}</option>
            {variants.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('scratches.cols.severity')}>
          <select
            className={inputCls()}
            value={filter.severity}
            onChange={e => patch({ severity: e.target.value as ScratchListFilter['severity'] })}
          >
            <option value="all">{t('common.all')}</option>
            {SEVERITIES.map(key => (
              <option key={key} value={key}>
                {t(`scratches.severity.${key}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('scratches.cols.willStop')}>
          <select
            className={inputCls()}
            value={filter.willStop}
            onChange={e => patch({ willStop: e.target.value as ScratchListFilter['willStop'] })}
          >
            <option value="all">{t('common.all')}</option>
            <option value="yes">{t('scratches.willStop.yes')}</option>
            <option value="no">{t('scratches.willStop.no')}</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{t('scratches.filters.shown', { shown: shownCount, total: items.length })}</span>
        {hasActiveScratchFilters(filter) && (
          <button
            type="button"
            className="font-bold text-cyan-300 hover:text-cyan-200"
            onClick={() => onChange(EMPTY_SCRATCH_FILTER)}
          >
            {t('scratches.filters.clear')}
          </button>
        )}
      </div>
    </div>
  )
}
