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
  | 'settings'

export type EngineeringPage = 'ipl' | 'stations' | 'lineBalancing'

export type AppPage = ProductionPage | EngineeringPage | 'profile'
