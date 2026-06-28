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
  | 'settings'

export type EngineeringPage = 'home' | 'ipl' | 'stations' | 'lineBalancing'

export type BomTab = 'parts' | 'compare' | 'categories' | 'import' | 'dashboard'

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

export type ProductivityTab = 'orders' | 'entry' | 'exit' | 'stops' | 'workDays'

export type ProductionPlanTab = 'planOrders'

export type WarehousesTab = 'home' | 'currentStock' | 'feeding'

export type WarehousesFeedingSubTab = 'plan' | 'actual'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
