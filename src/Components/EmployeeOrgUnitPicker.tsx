import { useMemo, type ReactNode } from 'react'
import { useLang } from '../i18n/LanguageContext'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { buildOrgPickerLevels, orgLevelLabel } from '../Utils/employeeOrgPicker'

type Props = {
  units: FactoryOrgUnit[]
  path: string[]
  onChange: (path: string[]) => void
  className?: string
}

function selectCls() {
  return 'input-dark'
}

function Field({
  label,
  children
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      {children}
    </label>
  )
}

export function EmployeeOrgUnitPicker({ units, path, onChange, className }: Props) {
  const { t } = useLang()

  const levels = useMemo(() => buildOrgPickerLevels(path, units), [path, units])

  if (units.length === 0) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        {t('org.f.orgUnitsEmpty')}
      </p>
    )
  }

  function setLevel(depth: number, value: string) {
    const next = path.slice(0, depth)
    if (value) next[depth] = value
    onChange(next)
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className ?? ''}`}>
      {levels.map(level => (
        <Field key={level.depth} label={orgLevelLabel(level.parentId, units, t)}>
          <select
            className={selectCls()}
            value={level.selectedId}
            onChange={e => setLevel(level.depth, e.target.value)}
          >
            <option value="">—</option>
            {level.options.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </Field>
      ))}
    </div>
  )
}
