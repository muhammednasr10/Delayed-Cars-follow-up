type Props = {
  count: number
  title?: string
}

export function PartModelCountBadge({ count, title }: Props) {
  const tone =
    count > 0
      ? 'bg-violet-500/20 text-violet-300'
      : 'bg-slate-800 text-slate-500'

  return (
    <span
      className={`inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums ${tone}`}
      title={title}
    >
      {count}
    </span>
  )
}
