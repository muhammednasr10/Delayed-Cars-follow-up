export type DepartmentId =
  | 'production'
  | 'warehouses'
  | 'planning'
  | 'engineering'
  | 'maintenance'
  | 'quality'
  | 'hr'

export type ProductionPage =
  | 'home'
  | 'missing'
  | 'vehicles'
  | 'training'
  | 'damagedParts'
  | 'missions'
  | 'requests'
  | 'scratches'
  | 'equipment'
  | 'feedback'
  | 'workerProfile'
  | 'settings'

export const WORKER_PROFILE_TAB_ORDER = ['data', 'station', 'equipment', 'attendance', 'errors'] as const

export type WorkerProfileTab = (typeof WORKER_PROFILE_TAB_ORDER)[number]

export const PRODUCTION_AREA_ORDER = ['body', 'paint', 'assembly', 'externalRepair'] as const

export type ProductionArea = (typeof PRODUCTION_AREA_ORDER)[number]

export type EngineeringPage = 'home' | 'ipl' | 'stations' | 'lineBalancing' | 'sop'

export type BomTab =
  | 'consolidated'
  | 'partList'
  | 'iplModels'
  | 'categories'
  | 'import'
  | 'dashboard'

export const BOM_TAB_ORDER = [
  'consolidated',
  'partList',
  'iplModels',
  'categories',
  'import',
  'dashboard'
] as const satisfies readonly BomTab[]

/** ترحيل المفتاح القديم `parts` → `consolidated` */
export function normalizeBomTab(tab: string | undefined): BomTab {
  if (tab === 'parts' || tab === 'consolidated') return 'consolidated'
  if (tab === 'partsGd' || tab === 'compare') return 'consolidated'
  if (BOM_TAB_ORDER.includes(tab as BomTab)) return tab as BomTab
  return 'consolidated'
}

/** مفتاح صلاحية التبويب الفرعي (القديم parts = consolidated) */
export function bomTabPermissionKey(tab: BomTab): string {
  if (tab === 'consolidated') return 'parts'
  return tab
}

export type LineBalancingTab = 'operations' | 'opParts' | 'timeStudy' | 'routing' | 'manpower' | 'import'

export type TrainingTab =
  | 'org'
  | 'attendance'
  | 'manpower'
  | 'operations'
  | 'stationSkills'
  | 'matrix'
  | 'qualification'
  | 'expiry'

export const SETTINGS_TAB_ORDER = ['administrations', 'models', 'stations', 'colors', 'users'] as const

export type SettingsTab = (typeof SETTINGS_TAB_ORDER)[number]

export type ProductivityTab = 'productivity' | 'stops'

export type ProductivitySubTab = 'daily' | 'monthly'

export type AttendanceSubTab = 'monthly' | 'yearly' | 'today'

/** تبويبات قسم التخطيط */
export const PLANNING_TAB_ORDER = ['plan', 'workDays', 'tracking', 'orders'] as const

export type PlanningTab = (typeof PLANNING_TAB_ORDER)[number]

export type WarehousesTab = 'home' | 'currentStock' | 'feeding' | 'equipment'

export type WarehousesFeedingSubTab = 'plan' | 'actual' | 'kanban'

export type WarehousesEquipmentSubTab = 'racks' | 'carts'

export type QualityTab = 'record' | 'study'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
