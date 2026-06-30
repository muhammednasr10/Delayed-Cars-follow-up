type Props = {
  value: string
  canManage: boolean
  placeholder: string
  onChange: (value: string) => void
  onBlur: () => void
}

export function ProductivityDelayReasonCell({ value, canManage, placeholder, onChange, onBlur }: Props) {
  if (!canManage) {
    return (
      <span className="block min-w-[10rem] whitespace-pre-wrap text-start text-xs text-slate-300">
        {value.trim() || '—'}
      </span>
    )
  }

  return (
    <textarea
      rows={2}
      className="w-full min-w-[10rem] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-start text-xs text-slate-200"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
    />
  )
}
