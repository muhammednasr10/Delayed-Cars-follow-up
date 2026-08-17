import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { MpLookupOption } from '../Types/mpLookup'
import { orgPathFromLeaf, orgPathLabel } from './employeeOrgPicker'

/** Map Settings → Administrations units into MP lookup options (code = org unit id). */
export function factoryOrgUnitsAsMpDepartments(
  units: FactoryOrgUnit[],
  opts?: { activeOnly?: boolean }
): MpLookupOption[] {
  const list = opts?.activeOnly === false ? units : units.filter(u => u.isActive)
  return list
    .map(u => {
      const label = orgPathLabel(orgPathFromLeaf(u.id, units), units) ?? u.name
      return {
        id: u.id,
        code: u.id,
        labelAr: label,
        labelEn: label,
        sortOrder: u.sortOrder,
        isActive: u.isActive
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.labelAr.localeCompare(b.labelAr, 'ar'))
}

/** Org-unit labels plus legacy mp_department_options codes (e.g. opt_…) for old shortage rows. */
export function mergeDepartmentLookups(
  units: FactoryOrgUnit[],
  legacy: MpLookupOption[]
): MpLookupOption[] {
  const fromOrg = factoryOrgUnitsAsMpDepartments(units, { activeOnly: false })
  const orgCodes = new Set(fromOrg.map(o => o.code))
  const legacyOnly = legacy.filter(o => !orgCodes.has(o.code))
  return [...fromOrg, ...legacyOnly]
}
