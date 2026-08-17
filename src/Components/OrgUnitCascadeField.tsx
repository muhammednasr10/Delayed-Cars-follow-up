import { useEffect, useMemo, useState } from 'react'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { FactoryOrgUnitPicker } from './FactoryOrgUnitPicker'
import { orgPathFromLeaf, orgPathLabel, orgPathLeaf } from '../Utils/employeeOrgPicker'

type Props = {
  units: FactoryOrgUnit[]
  value: string
  onChange: (unitId: string) => void
  className?: string
  emptyLabel?: string
  allowEmpty?: boolean
  showPathPreview?: boolean
  previewClassName?: string
}

/** Cascading administration → section → subsection picker; value is the deepest selected unit id. */
export function OrgUnitCascadeField({
  units,
  value,
  onChange,
  className,
  emptyLabel,
  allowEmpty = true,
  showPathPreview = true,
  previewClassName
}: Props) {
  const [path, setPath] = useState<string[]>(() => orgPathFromLeaf(value, units))

  useEffect(() => {
    setPath(orgPathFromLeaf(value, units))
  }, [value, units])

  const preview = useMemo(() => orgPathLabel(path, units), [path, units])

  function handlePathChange(next: string[]) {
    setPath(next)
    onChange(orgPathLeaf(next) ?? '')
  }

  return (
    <div className={className ?? 'space-y-2'}>
      <FactoryOrgUnitPicker
        units={units}
        path={path}
        onChange={handlePathChange}
        emptyLabel={emptyLabel}
        allowEmpty={allowEmpty}
      />
      {showPathPreview && preview && (
        <p
          className={
            previewClassName ??
            'rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300'
          }
        >
          {preview}
        </p>
      )}
    </div>
  )
}
