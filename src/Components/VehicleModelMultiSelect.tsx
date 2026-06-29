import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import type { VehicleModel } from '../Types/settings'

type Props = {
  models: VehicleModel[]
  value: string[]
  onChange: (modelIds: string[]) => void
  placeholder?: string
}

export function VehicleModelMultiSelect({ models, value, onChange, placeholder }: Props) {
  const { t } = useLang()
  const variants = useMemo(() => models.filter(m => m.model_kind === 'variant'), [models])
  const selected = useMemo(() => variants.filter(m => value.includes(m.id)), [variants, value])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return variants
    return variants.filter(m => m.name.toLowerCase().includes(q))
  }, [variants, query])

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter(v => v !== id))
    else onChange([...value, id])
  }

  function remove(id: string) {
    onChange(value.filter(v => v !== id))
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-100"
            >
              {m.name}
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => remove(m.id)}
                className="rounded p-0.5 text-emerald-300 hover:bg-emerald-500/20"
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className={inputCls()}
        value={query}
        placeholder={placeholder ?? t('qualityNotes.selectModelsPh')}
        onChange={e => setQuery(e.target.value)}
      />

      <div className="max-h-44 overflow-auto rounded-xl border border-slate-700 bg-slate-900/60 p-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500">{t('qualityNotes.noModelsMatch')}</p>
        ) : (
          filtered.map(m => {
            const checked = value.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => toggle(m.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition hover:bg-slate-800 ${
                  checked ? 'bg-emerald-500/15 text-emerald-100' : 'text-slate-200'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600 bg-slate-900'
                  }`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="font-bold">{m.name}</span>
              </button>
            )
          })
        )}
      </div>

      <p className="text-[10px] text-slate-500">{t('qualityNotes.modelsPickHint')}</p>
    </div>
  )
}
