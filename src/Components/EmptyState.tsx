import { type ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="rounded-2xl bg-slate-800/60 p-4 text-slate-400">{icon ?? <Inbox className="h-7 w-7" />}</div>
      <p className="text-sm font-bold text-slate-200">{title}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
