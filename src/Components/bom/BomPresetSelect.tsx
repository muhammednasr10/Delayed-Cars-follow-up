import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import type { BomPresetOption } from '../../Utils/bomPresetOptions'

type Props = {
  value: string
  onChange: (value: string) => void
  presets: BomPresetOption[]
  disabled?: boolean
  className?: string
}

export function BomPresetSelect({ value, onChange, presets, disabled, className }: Props) {
  const { t } = useLang()
  const [extras, setExtras] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [newValue, setNewValue] = useState('')

  const options = useMemo(() => {
    const seen = new Set<string>()
    const out: BomPresetOption[] = []
    for (const p of presets) {
      if (seen.has(p.value)) continue
      seen.add(p.value)
      out.push(p)
    }
    const add = (v: string) => {
      const trimmed = v.trim()
      if (!trimmed || seen.has(trimmed)) return
      seen.add(trimmed)
      const preset = presets.find(p => p.value === trimmed)
      out.push({ value: trimmed, label: preset?.label ?? trimmed })
    }
    add(value)
    for (const e of extras) add(e)
    return out
  }, [presets, value, extras])

  function commitNew() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    setExtras(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
    onChange(trimmed)
    setNewValue('')
    setAdding(false)
  }

  if (adding && !disabled) {
    return (
      <div className={`flex min-w-[7rem] items-center gap-1 ${className ?? ''}`}>
        <input
          className={`${inputCls()} min-w-0 flex-1 py-1 text-xs`}
          value={newValue}
          autoFocus
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitNew()
            }
            if (e.key === 'Escape') {
              setAdding(false)
              setNewValue('')
            }
          }}
        />
        <button
          type="button"
          onClick={commitNew}
          className="shrink-0 rounded bg-cyan-500/20 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/30"
        >
          {t('common.add')}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <select
        className={`${inputCls()} min-w-[6.5rem] py-1 text-xs`}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {!disabled && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="shrink-0 rounded-md bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-cyan-200"
          title={t('bom.addPresetOption')}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
