import { useLang } from '../i18n/LanguageContext'
import type { Employee } from '../Types/employee'

type Props = {
  managers: Employee[]
  value: string[]
  onChange: (managerIds: string[]) => void
}

export function ManagerMultiSelect({ managers, value, onChange }: Props) {
  const { t } = useLang()

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter(v => v !== id))
    else onChange([...value, id])
  }

  if (managers.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {managers.map(m => {
          const checked = value.includes(m.id)
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                checked
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-100'
                  : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              <input
                type="checkbox"
                className="rounded border-slate-600"
                checked={checked}
                onChange={() => toggle(m.id)}
              />
              <span className="font-bold">{m.fullName}</span>
              <span className="font-mono text-xs text-slate-500" dir="ltr">
                {m.employeeCode}
              </span>
            </label>
          )
        })}
      </div>
      {value.length > 0 && (
        <p className="text-[10px] text-slate-500">{t('requests.selectedManagers', { n: value.length })}</p>
      )}
    </div>
  )
}
