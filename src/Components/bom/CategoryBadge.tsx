export function CategoryBadge({ label, code }: { label: string; code?: string | null }) {
  const tone =
    code === 'UNCATEGORIZED' || !code
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
      : code === 'NEEDS_REVIEW'
        ? 'border-red-500/40 bg-red-500/10 text-red-200'
        : 'border-slate-600 bg-slate-800/80 text-slate-300'
  return <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${tone}`}>{label}</span>
}
