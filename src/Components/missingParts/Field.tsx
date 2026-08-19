import type { ReactNode } from 'react'

type Props = {
  label: string
  required?: boolean
  children: ReactNode
}

export function Field({ label, required, children }: Props) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
