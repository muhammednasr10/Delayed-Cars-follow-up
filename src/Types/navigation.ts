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

export type BomTab = 'parts' | 'partsGd' | 'compare' | 'categories' | 'import' | 'dashboard'

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

export type ProductivityTab = 'orders' | 'workDays' | 'entry' | 'exit' | 'stops' | 'summary'

export type ProductionPlanTab = 'planOrders'

export type WarehousesTab = 'home' | 'currentStock' | 'feeding'

export type WarehousesFeedingSubTab = 'plan' | 'actual'

export type QualityTab = 'record' | 'study'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
