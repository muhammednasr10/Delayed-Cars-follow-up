import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { DEFAULT_IPL_OPERATION_KIND, saveCustomIplOperationKind } from '../../Utils/iplOperationKind'

type Props = {
  value: string
  kinds: string[]
  disabled?: boolean
  onChange: (kind: string) => void
  onKindsChange: (kinds: string[]) => void
}

export function IplOperationKindSelect({ value, kinds, disabled, onChange, onKindsChange }: Props) {
  const { t } = useLang()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = value.trim() || DEFAULT_IPL_OPERATION_KIND

  function addKind() {
    const kind = saveCustomIplOperationKind(draft)
    if (!kind) return
    if (!kinds.includes(kind)) onKindsChange([...kinds, kind])
    onChange(kind)
    setDraft('')
    setAdding(false)
  }

  function cancelAdd() {
    setAdding(false)
    setDraft('')
  }

  if (adding) {
    return (
      <div className="flex gap-1">
        <input
          className="input-industrial min-w-0 flex-1"
          value={draft}
          autoFocus
          disabled={disabled}
          placeholder={t('bom.partOps.newKindPh')}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addKind()
            }
            if (event.key === 'Escape') cancelAdd()
          }}
        />
        <button
          type="button"
          className="rounded-lg bg-cyan-500 px-2.5 text-xs font-black text-slate-950 disabled:opacity-40"
          disabled={disabled || !draft.trim()}
          onClick={addKind}
        >
          {t('common.add')}
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-2 text-xs font-bold text-slate-200"
          disabled={disabled}
          onClick={cancelAdd}
        >
          {t('common.cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <select
        className="input-industrial min-w-0 flex-1"
        value={selected}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      >
        {kinds.map(kind => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
        {selected && !kinds.includes(selected) ? <option value={selected}>{selected}</option> : null}
      </select>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 text-cyan-200 disabled:opacity-40"
        disabled={disabled}
        title={t('bom.partOps.addKind')}
        aria-label={t('bom.partOps.addKind')}
        onClick={() => setAdding(true)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
