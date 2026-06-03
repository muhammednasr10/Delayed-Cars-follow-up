import { type ReactNode } from 'react'

export function inputCls(error?: string) {
  return `input-dark ${error ? 'border-red-500/60' : ''}`
}

export function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-300">{label}{required && <span className="text-red-400"> *</span>}</span>
      {children}
      {error && <span className="block text-xs font-semibold text-red-400">{error}</span>}
    </label>
  )
}

export function ActiveToggle({ active, activeLabel, inactiveLabel, onChange }: { active: boolean; activeLabel: string; inactiveLabel: string; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-100' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{activeLabel}</button>
      <button type="button" onClick={() => onChange(false)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${!active ? 'border-slate-500 bg-slate-500/15 text-slate-100' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{inactiveLabel}</button>
    </div>
  )
}
