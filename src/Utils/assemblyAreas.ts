import type { JobRole } from '../Types/enums'
import type { FactoryOrgUnit } from '../Types/factoryOrg'

/** قسم فرعي على خط التجميع. الأب اللي يغطي اتنين يدي الاتنين. */
export type AssemblyArea = 'trim_a' | 'trim_b' | 'chassis' | 'final'

const BARE_TRIM = /^(تريم|trim)$/i
const TRIM_A = /تريم\s*[أا]|trim\s*a/i
const TRIM_B = /تريم\s*[ب]|trim\s*b/i
const CHASSIS = /شاسيه|chassis/i
const FINAL = /فاينال|final/i

export function areasInName(name: string | null | undefined): Set<AssemblyArea> {
  const areas = new Set<AssemblyArea>()
  const text = name?.trim() ?? ''
  if (!text) return areas

  const bareTrim = BARE_TRIM.test(text)
  const trimCombined =
    (/تريم/.test(text) && /[أا]/.test(text) && /ب/.test(text)) ||
    (/trim/i.test(text) && /\ba\b/i.test(text) && /\bb\b/i.test(text))

  if (bareTrim || trimCombined || TRIM_A.test(text)) areas.add('trim_a')
  if (bareTrim || trimCombined || TRIM_B.test(text)) areas.add('trim_b')
  if (CHASSIS.test(text)) areas.add('chassis')
  if (FINAL.test(text)) areas.add('final')
  return areas
}

export function subtreeUnits(rootId: string, units: FactoryOrgUnit[]): FactoryOrgUnit[] {
  const byId = new Map(units.map(unit => [unit.id, unit]))
  const byParent = new Map<string, FactoryOrgUnit[]>()
  for (const unit of units) {
    if (!unit.parentId) continue
    const list = byParent.get(unit.parentId) ?? []
    list.push(unit)
    byParent.set(unit.parentId, list)
  }

  const root = byId.get(rootId)
  if (!root) return []

  const out: FactoryOrgUnit[] = []
  const seen = new Set<string>()
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || seen.has(current.id)) continue
    seen.add(current.id)
    out.push(current)
    for (const child of byParent.get(current.id) ?? []) stack.push(child)
  }
  return out
}

export function areasCoveredByOrgUnit(rootId: string | null | undefined, units: FactoryOrgUnit[]): Set<AssemblyArea> {
  const areas = new Set<AssemblyArea>()
  if (!rootId) return areas
  for (const unit of subtreeUnits(rootId, units)) {
    for (const area of areasInName(unit.name)) areas.add(area)
  }
  return areas
}

export function isProductivityRecorder(
  roleCode: string | null | undefined,
  roleNameAr: string | null | undefined,
  jobRole?: string | null
): boolean {
  if (roleCode === 'data_entry' || jobRole === 'data_entry') return true
  const name = roleNameAr?.trim() ?? ''
  return name.includes('مدخل بيانات') || name.includes('إدخال بيانات')
}

export type ProductivityWriteScope = {
  canEditEntry: boolean
  canEditExit: boolean
}

type ScopeEmployee = {
  jobRole: JobRole
  factoryOrgUnitId: string | null
  workAreaName: string | null
}

/** مشرف قسم أب يغطي التريمين يكتب الدخول، ومشرف الشاسيه والفاينال يكتب الخروج. المساعد عرض. مدخل البيانات يكتب الاتنين لما الصلاحية مفتوحة. */
export function productivityWriteScope(
  employee: ScopeEmployee | null | undefined,
  units: FactoryOrgUnit[],
  isAdmin: boolean,
  recordBoth = false
): ProductivityWriteScope {
  if (isAdmin || recordBoth || employee?.jobRole === 'data_entry') {
    return { canEditEntry: true, canEditExit: true }
  }
  if (!employee || employee.jobRole !== 'supervisor') return { canEditEntry: false, canEditExit: false }

  const areas =
    employee.factoryOrgUnitId && units.length > 0
      ? areasCoveredByOrgUnit(employee.factoryOrgUnitId, units)
      : areasInName(employee.workAreaName)

  return {
    canEditEntry: areas.has('trim_a') && areas.has('trim_b'),
    canEditExit: areas.has('chassis') && areas.has('final')
  }
}
