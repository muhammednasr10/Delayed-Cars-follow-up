export function PlanQtyField({
  label,
  value,
  canEdit,
  onChange,
  tone,
  showLabel = true
}: {
  label: string
  value: number
  canEdit: boolean
  onChange: (n: number) => void
  tone: 'cyan' | 'rose'
  showLabel?: boolean
}) {
  const border = tone === 'cyan' ? 'border-violet-600/50 text-cyan-300' : 'border-rose-600/40 text-rose-300'
  const shown = value || '—'

  if (!canEdit) {
    return (
      <div>
        {showLabel && <p className="text-[10px] font-bold text-slate-500">{label}</p>}
        <span className={`font-black ${tone === 'cyan' ? 'text-cyan-300' : 'text-rose-300'}`}>{shown}</span>
      </div>
    )
  }

  return (
    <div className="text-center">
      {showLabel && <p className="text-[10px] font-bold text-slate-500">{label}</p>}
      <input
        type="number"
        min={0}
        className={`w-20 rounded-lg border bg-slate-950 px-2 py-1.5 text-center text-sm font-black ${border}`}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        title={label}
      />
    </div>
  )
}
