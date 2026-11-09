import { useEffect, useMemo, useState } from 'react'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { FactoryOrgUnitPicker } from './FactoryOrgUnitPicker'
import {
  administrationOnlyUnits,
  orgAdministrationId,
  orgPathFromLeaf,
  orgPathLabel,
  orgPathLeaf
} from '../Utils/employeeOrgPicker'

type Props = {
  units: FactoryOrgUnit[]
  value: string
  onChange: (unitId: string) => void
  className?: string
  emptyLabel?: string
  allowEmpty?: boolean
  showPathPreview?: boolean
  previewClassName?: string
  /** Only pick top-level administrations (no section / subsection cascade). */
  administrationsOnly?: boolean
  /** Hide inner «إدارة / قسم» labels when the outer field already has a title. */
  hideLevelLabels?: boolean
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
  previewClassName,
  administrationsOnly = false,
  hideLevelLabels = false
}: Props) {
  const pickerUnits = useMemo(
    () => (administrationsOnly ? administrationOnlyUnits(units) : units),
    [administrationsOnly, units]
  )
  const resolvedValue = useMemo(
    () => (administrationsOnly ? orgAdministrationId(value, units) : value),
    [administrationsOnly, value, units]
  )
  const [path, setPath] = useState<string[]>(() => orgPathFromLeaf(resolvedValue, pickerUnits))

  useEffect(() => {
    setPath(orgPathFromLeaf(resolvedValue, pickerUnits))
  }, [resolvedValue, pickerUnits])

  const preview = useMemo(() => orgPathLabel(path, pickerUnits), [path, pickerUnits])
  const showPreview = showPathPreview && !administrationsOnly

  function handlePathChange(next: string[]) {
    setPath(next)
    onChange(orgPathLeaf(next) ?? '')
  }

  const hideLabels = hideLevelLabels || administrationsOnly

  return (
    <div className={className ?? (hideLabels ? undefined : 'space-y-2')}>
      <FactoryOrgUnitPicker
        units={pickerUnits}
        path={path}
        onChange={handlePathChange}
        emptyLabel={emptyLabel}
        allowEmpty={allowEmpty}
        hideLevelLabels={hideLabels}
      />
      {showPreview && preview && (
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
