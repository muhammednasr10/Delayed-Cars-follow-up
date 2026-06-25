import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import type { MpLookupOption } from '../Types/mpLookup'
import { mpLookupLabel } from '../Utils/mpLookupLabel'

type Props = {
  options: MpLookupOption[]
  value: string
  onChange: (code: string) => void
  onCreate: (labelAr: string) => Promise<MpLookupOption>
  addLabel: string
  className?: string
  disabled?: boolean
}

export function MpLookupCreatableSelect({
  options,
  value,
  onChange,
  onCreate,
  addLabel,
  className = 'input-dark',
  disabled
}: Props) {
  const { t, lang } = useLang()
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveNew() {
    const label = newLabel.trim()
    if (!label) {
      setError(t('mp.lookupLabelRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const opt = await onCreate(label)
      onChange(opt.code)
      setNewLabel('')
      setAdding(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className={`${className} min-w-0 flex-1`}
          value={value}
          disabled={disabled || options.length === 0}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(o => (
            <option key={o.code} value={o.code}>
              {mpLookupLabel(options, o.code, lang)}
            </option>
          ))}
        </select>
        <button
          type="button"
          title={addLabel}
          disabled={disabled || saving}
          onClick={() => {
            setAdding(a => !a)
            setError('')
          }}
          className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-2">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-[10px] font-bold text-slate-500">{addLabel}</span>
            <input
              className="input-dark w-full"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={t('mp.lookupNewPlaceholder')}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void saveNew()
                }
              }}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveNew()}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.add')}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setNewLabel('')
              setError('')
            }}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
