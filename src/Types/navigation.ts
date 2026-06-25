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

export type SettingsTab = 'models' | 'stations' | 'colors' | 'areas' | 'reasons' | 'departments' | 'users'

export type ProductivityTab = 'orders' | 'entry' | 'exit' | 'stops' | 'workDays'

export type ProductionPlanTab = 'planOrders'

export type WarehousesTab = 'home' | 'currentStock' | 'feeding'

export type WarehousesFeedingSubTab = 'plan' | 'actual'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
