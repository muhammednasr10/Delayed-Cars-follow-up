import { useEffect, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'

type Props = {
  value: string
  placeholder?: string
  canEdit: boolean
  dir?: 'ltr' | 'rtl'
  accent?: boolean
  sub?: boolean
  onSave: (next: string) => Promise<void>
}

export function InlineEditableText({
  value,
  placeholder,
  canEdit,
  dir,
  accent,
  sub,
  onSave
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function commit() {
    const next = draft.trim()
    if (next === value.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (!canEdit) {
    return (
      <p
        className={`mt-0.5 ${sub ? 'text-sm text-slate-400' : `font-black ${accent ? 'text-cyan-300' : 'text-white'}`}`}
        dir={dir}
      >
        {value.trim() || placeholder || '—'}
      </p>
    )
  }

  if (editing) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <input
          className={`min-w-[8rem] flex-1 rounded-lg border border-cyan-500/40 bg-slate-950 px-2 py-1 ${
            sub ? 'text-sm text-slate-200' : 'text-base font-black text-white'
          }`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') void commit()
            if (e.key === 'Escape') cancel()
          }}
          dir={dir}
          autoFocus
          disabled={saving}
        />
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={() => void commit()}
          className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-40"
          title="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={cancel}
          className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const display = value.trim() || placeholder || '—'
  const empty = !value.trim()

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group mt-0.5 flex max-w-full items-start gap-1.5 text-start ${sub ? '' : 'font-black'}`}
      dir={dir}
    >
      <span
        className={
          empty
            ? 'text-sm italic text-slate-500'
            : sub
              ? 'text-sm text-slate-300'
              : accent
                ? 'text-cyan-300'
                : 'text-white'
        }
      >
        {display}
      </span>
      <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-slate-600 opacity-0 transition group-hover:opacity-100" />
    </button>
  )
}
