/** صلاحيات ظهور الصفحات في القائمة — module_key = pages */

export type AppPagePermissionKey =
  | 'production_home'
  | 'production_missing'
  | 'production_productivity'
  | 'production_training'
  | 'production_damaged_parts'
  | 'production_missions'
  | 'production_requests'
  | 'production_scratches'
  | 'production_equipment'
  | 'production_feedback'
  | 'production_worker_profile'
  | 'production_settings'
  | 'engineering_home'
  | 'engineering_ipl'
  | 'engineering_stations'
  | 'engineering_line_balancing'
  | 'engineering_sop'
  | 'warehouses_home'
  | 'warehouses_stock'
  | 'warehouses_feeding'
  | 'quality_notes'

export type AppPageDef = {
  permKey: AppPagePermissionKey
  labelKey: string
  descKey: string
  /** وحدة بديلة عند عدم ضبط صلاحية الصفحة بعد */
  fallbackModule?: string
  /** افتراضي عند عدم وجود سجل صريح */
  defaultVisible?: boolean
}

export const APP_PAGE_DEFINITIONS: AppPageDef[] = [
  { permKey: 'production_home', labelKey: 'nav.home', descKey: 'permissions.matrix.pageDesc.production_home', defaultVisible: true },
  { permKey: 'production_missing', labelKey: 'nav.missingParts', descKey: 'permissions.matrix.pageDesc.production_missing', fallbackModule: 'missing_parts' },
  { permKey: 'production_productivity', labelKey: 'nav.productivity', descKey: 'permissions.matrix.pageDesc.production_productivity', fallbackModule: 'production' },
  { permKey: 'production_training', labelKey: 'nav.training', descKey: 'permissions.matrix.pageDesc.production_training', fallbackModule: 'training_matrix' },
  { permKey: 'production_damaged_parts', labelKey: 'nav.damagedParts', descKey: 'permissions.matrix.pageDesc.production_damaged_parts', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_missions', labelKey: 'nav.missions', descKey: 'permissions.matrix.pageDesc.production_missions', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_requests', labelKey: 'nav.requests', descKey: 'permissions.matrix.pageDesc.production_requests', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_scratches', labelKey: 'nav.scratches', descKey: 'permissions.matrix.pageDesc.production_scratches', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_equipment', labelKey: 'nav.equipment', descKey: 'permissions.matrix.pageDesc.production_equipment', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_feedback', labelKey: 'nav.feedback', descKey: 'permissions.matrix.pageDesc.production_feedback', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_worker_profile', labelKey: 'nav.workerProfile', descKey: 'permissions.matrix.pageDesc.production_worker_profile', fallbackModule: 'production', defaultVisible: true },
  { permKey: 'production_settings', labelKey: 'nav.settings', descKey: 'permissions.matrix.pageDesc.production_settings' },
  { permKey: 'engineering_home', labelKey: 'nav.home', descKey: 'permissions.matrix.pageDesc.engineering_home', defaultVisible: true },
  { permKey: 'engineering_ipl', labelKey: 'nav.ipl', descKey: 'permissions.matrix.pageDesc.engineering_ipl', fallbackModule: 'bom' },
  { permKey: 'engineering_stations', labelKey: 'nav.stations', descKey: 'permissions.matrix.pageDesc.engineering_stations', fallbackModule: 'station_operations' },
  { permKey: 'engineering_line_balancing', labelKey: 'nav.lineBalancing', descKey: 'permissions.matrix.pageDesc.engineering_line_balancing', fallbackModule: 'station_operations' },
  { permKey: 'engineering_sop', labelKey: 'nav.sop', descKey: 'permissions.matrix.pageDesc.engineering_sop', fallbackModule: 'station_operations' },
  { permKey: 'warehouses_home', labelKey: 'nav.home', descKey: 'permissions.matrix.pageDesc.warehouses_home', fallbackModule: 'inventory', defaultVisible: true },
  { permKey: 'warehouses_stock', labelKey: 'warehouses.tabs.currentStock', descKey: 'permissions.matrix.pageDesc.warehouses_stock', fallbackModule: 'inventory' },
  { permKey: 'warehouses_feeding', labelKey: 'warehouses.tabs.feeding', descKey: 'permissions.matrix.pageDesc.warehouses_feeding', fallbackModule: 'inventory' },
  { permKey: 'quality_notes', labelKey: 'qualityNotes.title', descKey: 'permissions.matrix.pageDesc.quality_notes', fallbackModule: 'qc', defaultVisible: true }
]

const PAGE_BY_PRODUCTION: Record<string, AppPagePermissionKey> = {
  home: 'production_home',
  missing: 'production_missing',
  vehicles: 'production_productivity',
  training: 'production_training',
  damagedParts: 'production_damaged_parts',
  missions: 'production_missions',
  requests: 'production_requests',
  scratches: 'production_scratches',
  equipment: 'production_equipment',
  feedback: 'production_feedback',
  workerProfile: 'production_worker_profile',
  settings: 'production_settings'
}

const PAGE_BY_ENGINEERING: Record<string, AppPagePermissionKey> = {
  home: 'engineering_home',
  ipl: 'engineering_ipl',
  stations: 'engineering_stations',
  lineBalancing: 'engineering_line_balancing',
  sop: 'engineering_sop'
}

const PAGE_BY_WAREHOUSES: Record<string, AppPagePermissionKey> = {
  home: 'warehouses_home',
  currentStock: 'warehouses_stock',
  feeding: 'warehouses_feeding'
}

export function pagePermForProduction(page: string): AppPagePermissionKey | undefined {
  return PAGE_BY_PRODUCTION[page]
}

export function pagePermForEngineering(page: string): AppPagePermissionKey | undefined {
  return PAGE_BY_ENGINEERING[page]
}

export function pagePermForWarehouses(tab: string): AppPagePermissionKey | undefined {
  return PAGE_BY_WAREHOUSES[tab]
}

export function pageDefByPermKey(key: AppPagePermissionKey): AppPageDef | undefined {
  return APP_PAGE_DEFINITIONS.find(p => p.permKey === key)
}
