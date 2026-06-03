export function DuplicateBadge({ status }: { status: string | null }) {
  if (!status) return null
  const s = status.toLowerCase()
  const cls =
    s === 'unique'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : s === 'duplicate'
        ? 'border-orange-500/40 bg-orange-500/10 text-orange-200'
        : s === 'possible_duplicate'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          : 'border-slate-600 bg-slate-800 text-slate-400'
  const label =
    s === 'unique'
      ? 'فريد'
      : s === 'duplicate'
        ? 'مكرر'
        : s === 'possible_duplicate'
          ? 'مكرر محتمل'
          : 'يحتاج مراجعة'
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${cls}`}>{label}</span>
}
