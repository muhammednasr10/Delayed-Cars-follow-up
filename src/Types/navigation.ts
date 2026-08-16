export type DepartmentId = 'production' | 'warehouses' | 'planning' | 'engineering' | 'maintenance' | 'quality' | 'hr'

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

export type BomTab = 'consolidated' | 'partList' | 'iplModels' | 'categories' | 'import' | 'dashboard'

export const BOM_TAB_ORDER = [
  'iplModels',
  'categories',
  'import',
  'dashboard'
] as const satisfies readonly BomTab[]

/** ترحيل المفاتيح القديمة (مجمع / قائمة أجزاء / parts) → IPL */
export function normalizeBomTab(tab: string | undefined): BomTab {
  if (
    tab === 'parts' ||
    tab === 'consolidated' ||
    tab === 'partsGd' ||
    tab === 'compare' ||
    tab === 'partList'
  ) {
    return 'iplModels'
  }
  if (BOM_TAB_ORDER.includes(tab as (typeof BOM_TAB_ORDER)[number])) return tab as BomTab
  return 'iplModels'
}

/** مفتاح صلاحية التبويب الفرعي (القديم parts = مجمع) */
export function bomTabPermissionKey(tab: BomTab): string {
  if (tab === 'consolidated' || tab === 'partList') return 'iplModels'
  return tab
}

export type LineBalancingTab = 'operations' | 'opParts' | 'timeStudy' | 'routing' | 'manpower' | 'import'

export type TrainingTab =
  'org' | 'attendance' | 'manpower' | 'operations' | 'stationSkills' | 'matrix' | 'qualification' | 'expiry'

export const SETTINGS_TAB_ORDER = ['administrations', 'models', 'stations', 'colors', 'helperLists', 'users'] as const

export type SettingsTab = (typeof SETTINGS_TAB_ORDER)[number]

export const SETTINGS_STATIONS_SUB_TAB_ORDER = ['assemblyLine'] as const

export type SettingsStationsSubTab = (typeof SETTINGS_STATIONS_SUB_TAB_ORDER)[number]

export type ProductivityTab = 'productivity' | 'stops'

export type ProductivitySubTab = 'daily' | 'monthly'

export type AttendanceSubTab = 'monthly' | 'yearly' | 'today'

/** تبويبات قسم التخطيط */
export const PLANNING_TAB_ORDER = ['plan', 'workDays', 'tracking', 'orders'] as const

export type PlanningTab = (typeof PLANNING_TAB_ORDER)[number]

/** مستوى عرض خطة الإنتاج داخل تبويب plan */
export const PLAN_SCOPE_ORDER = ['hub', 'monthly', 'annual'] as const

export type PlanScope = (typeof PLAN_SCOPE_ORDER)[number]

export type WarehousesTab = 'home' | 'currentStock' | 'feeding' | 'equipment'

export type WarehousesFeedingSubTab = 'plan' | 'actual' | 'kanban'

export type WarehousesEquipmentSubTab = 'racks' | 'carts'

export type QualityTab = 'record' | 'study'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
