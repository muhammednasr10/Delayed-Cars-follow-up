import type { MissingPartDetail, MissingPartFilters } from '../Types/missingPart'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { VehicleModel } from '../Types/settings'
import { inferParentNameFromVariant } from './vehicleModelHierarchy'
import { employeeMatchesOrgFilter } from './employeeOrgPicker'

/** Sentinel for «show rows with no value in this field». */
export const MP_FILTER_UNASSIGNED = '__unassigned__'

export function isUnassignedFilter(value: string | string[]): boolean {
  if (Array.isArray(value)) return value.includes(MP_FILTER_UNASSIGNED)
  return value === MP_FILTER_UNASSIGNED
}

function isEmptyDepartmentValue(value: string | null | undefined): boolean {
  return !value?.trim()
}

export const ACTIVE_COLS = [
  'select',
  'vin',
  'model',
  'color',
  'createdBy',
  'qty',
  'reason',
  'dateTime',
  'actions'
] as const
export const HISTORY_COLS = [
  'select',
  'vin',
  'model',
  'color',
  'createdBy',
  'qty',
  'reason',
  'dateTime',
  'completer',
  'resolvedAt',
  'actions'
] as const

export const cell = 'table-cell-compact whitespace-nowrap text-center align-middle'
export const actionsCell = `${cell} sticky z-10 bg-slate-900/95 shadow-[inset_8px_0_12px_rgba(0,0,0,0.3)]`
export const iconSize = 'h-[18px] w-[18px]'

export function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

/** `YYYY-MM` from shortageResolvedAt (UTC calendar month). */
export function resolvedMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const raw = iso.slice(0, 7)
    return /^\d{4}-\d{2}$/.test(raw) ? raw : null
  }
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Distinct archive months from items, newest first. */
export function listResolvedMonths(items: MissingPartDetail[]): string[] {
  const set = new Set<string>()
  for (const i of items) {
    const key = resolvedMonthKey(i.shortageResolvedAt)
    if (key) set.add(key)
  }
  return [...set].sort((a, b) => b.localeCompare(a))
}

export function formatResolvedMonthLabel(monthKey: string, lang: string): string {
  const [ys, ms] = monthKey.split('-')
  const y = Number(ys)
  const m = Number(ms)
  if (!y || !m || m < 1 || m > 12) return monthKey
  const date = new Date(Date.UTC(y, m - 1, 1))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

export function localDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const raw = iso.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayLocalDayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function matchesDepartmentFilter(
  rowDept: string | null | undefined,
  filterDeptIds: string[],
  orgUnits: FactoryOrgUnit[]
): boolean {
  if (filterDeptIds.length === 0) return true
  const wantsUnassigned = filterDeptIds.includes(MP_FILTER_UNASSIGNED)
  const deptIds = filterDeptIds.filter(id => id !== MP_FILTER_UNASSIGNED)
  const empty = isEmptyDepartmentValue(rowDept)

  if (wantsUnassigned && empty) return true
  if (deptIds.length === 0) return false
  if (empty) return false

  return deptIds.some(
    d => d === rowDept || (orgUnits.length > 0 && employeeMatchesOrgFilter(rowDept, d, orgUnits))
  )
}

export function hasActiveMissingPartFilters(filters: MissingPartFilters): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.modelNames.length > 0 ||
      filters.departments.length > 0 ||
      filters.completingDepartments.length > 0 ||
      filters.followUpEmployeeId ||
      filters.resolvedMonth ||
      filters.dateFrom ||
      filters.dateTo
  )
}

export function applyFilters(
  items: MissingPartDetail[],
  filters: MissingPartFilters,
  options?: { dateField?: 'created' | 'resolved'; orgUnits?: FactoryOrgUnit[] }
) {
  const models = new Set(filters.modelNames)
  const orgUnits = options?.orgUnits ?? []
  const month = filters.resolvedMonth
  const dateFrom = filters.dateFrom?.trim() ?? ''
  const dateTo = filters.dateTo?.trim() ?? ''
  const dateField = options?.dateField ?? 'created'
  const base = items
    .filter(i => models.size === 0 || models.has(i.modelName))
    .filter(i => matchesDepartmentFilter(i.department, filters.departments, orgUnits))
    .filter(i => matchesDepartmentFilter(i.completingDepartment, filters.completingDepartments, orgUnits))
    .filter(i => {
      const followUp = filters.followUpEmployeeId
      if (!followUp) return true
      if (followUp === MP_FILTER_UNASSIGNED) return !i.followUpEmployeeId
      return i.followUpEmployeeId === followUp
    })
    .filter(i => !month || resolvedMonthKey(i.shortageResolvedAt) === month)
    .filter(i => {
      if (!dateFrom && !dateTo) return true
      const day = localDayKey(dateField === 'resolved' ? i.shortageResolvedAt : i.createdAt)
      if (!day) return false
      if (dateFrom && day < dateFrom) return false
      if (dateTo && day > dateTo) return false
      return true
    })

  const q = filters.search.trim().toLowerCase()
  if (!q) return base

  const matchingGroups = new Set<string>()
  for (const i of base) {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q) && i.reportGroupId) {
      matchingGroups.add(i.reportGroupId)
    }
  }

  return base.filter(i => {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q)) return true
    return Boolean(i.reportGroupId && matchingGroups.has(i.reportGroupId))
  })
}

export function canCompleteVehicle(vehicleId: string, parts: MissingPartDetail[]): boolean {
  const lines = parts.filter(p => p.vehicleId === vehicleId)
  return lines.some(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
}

export function reporterNames(parts: MissingPartDetail[]): string {
  const names = [
    ...new Set(
      parts
        .map(p => p.createdByName?.trim() || p.createdByEmail?.trim())
        .filter((n): n is string => Boolean(n))
    )
  ]
  return names.length > 0 ? names.join(' · ') : '—'
}

export function completerNames(parts: MissingPartDetail[]): string {
  const names = [
    ...new Set(parts.map(p => p.shortageResolvedByName?.trim()).filter((n): n is string => Boolean(n)))
  ]
  return names.length > 0 ? names.join(' · ') : '—'
}

export function uniqueVehicleReps(parts: MissingPartDetail[]): MissingPartDetail[] {
  const seen = new Set<string>()
  const reps: MissingPartDetail[] = []
  for (const part of parts) {
    if (seen.has(part.vehicleId)) continue
    seen.add(part.vehicleId)
    reps.push(part)
  }
  return reps
}

export function uniqueIssueReps(parts: MissingPartDetail[]): MissingPartDetail[] {
  const map = new Map<string, MissingPartDetail>()
  for (const part of parts) {
    const key = `${part.partDescription}|${part.reason}|${part.department}`
    if (!map.has(key)) map.set(key, part)
  }
  return [...map.values()]
}

export function isMissingPartRowOpen(parts: MissingPartDetail[]): boolean {
  return parts.some(p => p.status !== 'closed' && p.status !== 'cancelled')
}

export function openVehicleShortageLines(vehicleId: string, parts: MissingPartDetail[]): MissingPartDetail[] {
  return parts.filter(
    p => p.vehicleId === vehicleId && !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled'
  )
}

export function remainingInstallLineCount(parts: MissingPartDetail[]): number {
  return parts.filter(p => p.installedQty < p.requiredQty).length
}

export function isFirstVehicleRow(list: MissingPartDetail[], index: number, vehicleId: string): boolean {
  return list.findIndex(x => x.vehicleId === vehicleId) === index
}

export function formatDateTime(iso: string, lang: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
  return {
    date: d.toLocaleDateString(locale),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
}

export type ModelVehicleCountRow = { model: string; count: number }

export type FamilyVehicleCountRow = {
  familyId: string
  familyName: string
  count: number
  variants: ModelVehicleCountRow[]
}

export function buildModelVehicleCounts(items: MissingPartDetail[]): {
  total: number
  byModel: ModelVehicleCountRow[]
} {
  const byModel = new Map<string, Set<string>>()
  for (const item of items) {
    const model = item.modelName?.trim() || '—'
    const set = byModel.get(model) ?? new Set<string>()
    set.add(item.vehicleId)
    byModel.set(model, set)
  }

  const byModelRows = [...byModel.entries()]
    .map(([model, ids]) => ({ model, count: ids.size }))
    .sort((a, b) => a.model.localeCompare(b.model, 'ar', { sensitivity: 'base' }))

  return {
    total: new Set(items.map(i => i.vehicleId)).size,
    byModel: byModelRows
  }
}

export type VariantVehicleSummary = {
  vehicleId: string
  vin: string
  modelName: string
  colorName: string | null
  colorCode: string | null
  colorHex: string | null
  parts: MissingPartDetail[]
}

export function buildVariantVehicleSummaries(items: MissingPartDetail[], variantName: string): VariantVehicleSummary[] {
  const normalized = variantName.trim().toUpperCase()
  const map = new Map<string, MissingPartDetail[]>()
  for (const item of items) {
    if (item.modelName.trim().toUpperCase() !== normalized) continue
    const list = map.get(item.vehicleId) ?? []
    list.push(item)
    map.set(item.vehicleId, list)
  }
  return [...map.entries()]
    .map(([vehicleId, parts]) => ({
      vehicleId,
      vin: parts[0].vin,
      modelName: parts[0].modelName,
      colorName: parts[0].colorName,
      colorCode: parts[0].colorCode,
      colorHex: parts[0].colorHex,
      parts
    }))
    .sort((a, b) => a.vin.localeCompare(b.vin, undefined, { numeric: true }))
}

export function buildFamilyVehicleCounts(
  items: MissingPartDetail[],
  models: VehicleModel[]
): { total: number; byFamily: FamilyVehicleCountRow[] } {
  const byName = new Map(models.map(m => [m.name.trim().toUpperCase(), m]))

  function resolve(modelName: string) {
    const name = modelName.trim() || '—'
    const model = byName.get(name.toUpperCase())
    if (model?.model_kind === 'family') {
      return { familyKey: model.id, familyName: model.name, variantName: model.name }
    }
    if (model?.parent_model_id) {
      const family = models.find(f => f.id === model.parent_model_id)
      const familyName = family?.name ?? inferParentNameFromVariant(model.name) ?? name
      return { familyKey: family?.id ?? model.parent_model_id, familyName, variantName: model.name }
    }
    const inferred = model ? inferParentNameFromVariant(model.name) : inferParentNameFromVariant(name)
    const familyName = inferred ?? name
    return { familyKey: `name:${familyName.toUpperCase()}`, familyName, variantName: name }
  }

  const families = new Map<string, { familyName: string; vehicles: Set<string>; variants: Map<string, Set<string>> }>()

  for (const item of items) {
    const { familyKey, familyName, variantName } = resolve(item.modelName)
    const bucket = families.get(familyKey) ?? { familyName, vehicles: new Set<string>(), variants: new Map() }
    bucket.vehicles.add(item.vehicleId)
    const variantSet = bucket.variants.get(variantName) ?? new Set<string>()
    variantSet.add(item.vehicleId)
    bucket.variants.set(variantName, variantSet)
    families.set(familyKey, bucket)
  }

  const byFamily = [...families.entries()]
    .map(([familyId, bucket]) => ({
      familyId,
      familyName: bucket.familyName,
      count: bucket.vehicles.size,
      variants: [...bucket.variants.entries()]
        .map(([model, ids]) => ({ model, count: ids.size }))
        .sort((a, b) => a.model.localeCompare(b.model, 'ar', { sensitivity: 'base' }))
    }))
    .sort((a, b) => a.familyName.localeCompare(b.familyName, 'ar', { sensitivity: 'base' }))

  return {
    total: new Set(items.map(i => i.vehicleId)).size,
    byFamily
  }
}
