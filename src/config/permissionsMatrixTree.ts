import type { AppPagePermissionKey } from './pageAccess'

export type MatrixActionModule = {
  moduleKey: string
  actions?: string[]
}

export type MatrixTreeNode = {
  id: string
  labelKey: string
  descKey?: string
  /** صلاحية ظهور صفحة/تبويب — module_key = pages */
  pagePerm?: string
  actionModules?: MatrixActionModule[]
  children?: MatrixTreeNode[]
}

/** إجراءات خطة الإنتاج والتبويبات الفرعية للإنتاجية */
const PRODUCTION_TAB_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export', 'import'] as const

function productionTabActions(): MatrixActionModule[] {
  return [{ moduleKey: 'production', actions: [...PRODUCTION_TAB_ACTIONS] }]
}

/** شجرة مصفوفة الصلاحيات — مطابقة للقائمة والتبويبات في التطبيق */
export const PERMISSIONS_MATRIX_TREE: MatrixTreeNode[] = [
  {
    id: 'dept_production',
    labelKey: 'permissions.matrix.depts.production',
    children: [
      {
        id: 'prod_home',
        labelKey: 'nav.home',
        descKey: 'permissions.matrix.pageDesc.production_home',
        pagePerm: 'production_home'
      },
      {
        id: 'prod_missing',
        labelKey: 'nav.missingParts',
        descKey: 'permissions.matrix.pageDesc.production_missing',
        pagePerm: 'production_missing',
        actionModules: [
          {
            moduleKey: 'missing_parts',
            actions: [
              'view',
              'create',
              'filter',
              'update_status',
              'notes',
              'update',
              'delete',
              'complete',
              'bulk_install',
              'export'
            ]
          }
        ],
        children: [
          {
            id: 'mp_active',
            labelKey: 'mp.tabs.active',
            pagePerm: 'production_missing__active'
          },
          {
            id: 'mp_summary',
            labelKey: 'mp.tabs.summary',
            pagePerm: 'production_missing__summary'
          },
          {
            id: 'mp_history',
            labelKey: 'mp.tabs.history',
            pagePerm: 'production_missing__history'
          },
          {
            id: 'mp_hist_summary',
            labelKey: 'mp.tabs.historySummary',
            pagePerm: 'production_missing__historySummary'
          }
        ]
      },
      {
        id: 'prod_vehicles',
        labelKey: 'nav.productivity',
        descKey: 'permissions.matrix.pageDesc.production_productivity',
        pagePerm: 'production_productivity',
        children: [
          {
            id: 'prod_veh_orders',
            labelKey: 'productivity.tabs.orders',
            pagePerm: 'production_productivity__orders',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_workdays',
            labelKey: 'productionOrders.tabs.workDays',
            pagePerm: 'production_productivity__workDays',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_entry',
            labelKey: 'productivity.tabs.entry',
            pagePerm: 'production_productivity__entry',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_exit',
            labelKey: 'productivity.tabs.exit',
            pagePerm: 'production_productivity__exit',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_stops',
            labelKey: 'productivity.tabs.stops',
            pagePerm: 'production_productivity__stops',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_summary',
            labelKey: 'productivity.tabs.summary',
            pagePerm: 'production_productivity__summary',
            actionModules: productionTabActions()
          },
          {
            id: 'prod_veh_plan',
            labelKey: 'productionOrders.tabs.planOrders',
            pagePerm: 'production_productivity__planOrders',
            actionModules: productionTabActions()
          }
        ]
      },
      {
        id: 'prod_training',
        labelKey: 'nav.training',
        descKey: 'permissions.matrix.pageDesc.production_training',
        pagePerm: 'production_training',
        actionModules: [{ moduleKey: 'training_matrix' }, { moduleKey: 'employees' }],
        children: [
          { id: 'prod_tr_org', labelKey: 'training.tabs.org', pagePerm: 'production_training__org' },
          { id: 'prod_tr_att', labelKey: 'training.tabs.attendance', pagePerm: 'production_training__attendance' },
          { id: 'prod_tr_man', labelKey: 'training.tabs.manpower', pagePerm: 'production_training__manpower' },
          { id: 'prod_tr_ops', labelKey: 'training.tabs.operations', pagePerm: 'production_training__operations' },
          { id: 'prod_tr_skills', labelKey: 'training.tabs.stationSkills', pagePerm: 'production_training__stationSkills' },
          { id: 'prod_tr_matrix', labelKey: 'training.tabs.matrix', pagePerm: 'production_training__matrix' },
          { id: 'prod_tr_qual', labelKey: 'training.tabs.qualification', pagePerm: 'production_training__qualification' },
          { id: 'prod_tr_expiry', labelKey: 'training.tabs.expiry', pagePerm: 'production_training__expiry' }
        ]
      },
      {
        id: 'prod_worker_profile',
        labelKey: 'nav.workerProfile',
        descKey: 'permissions.matrix.pageDesc.production_worker_profile',
        pagePerm: 'production_worker_profile',
        children: [
          { id: 'prod_wp_data', labelKey: 'workerProfile.tabs.data', pagePerm: 'production_worker_profile__data' },
          { id: 'prod_wp_station', labelKey: 'workerProfile.tabs.station', pagePerm: 'production_worker_profile__station' },
          { id: 'prod_wp_equipment', labelKey: 'workerProfile.tabs.equipment', pagePerm: 'production_worker_profile__equipment' },
          { id: 'prod_wp_attendance', labelKey: 'workerProfile.tabs.attendance', pagePerm: 'production_worker_profile__attendance' },
          { id: 'prod_wp_errors', labelKey: 'workerProfile.tabs.errors', pagePerm: 'production_worker_profile__errors' }
        ]
      },
      {
        id: 'prod_damaged',
        labelKey: 'nav.damagedParts',
        descKey: 'permissions.matrix.pageDesc.production_damaged_parts',
        pagePerm: 'production_damaged_parts',
        actionModules: [{ moduleKey: 'production' }]
      },
      {
        id: 'prod_missions',
        labelKey: 'nav.missions',
        descKey: 'permissions.matrix.pageDesc.production_missions',
        pagePerm: 'production_missions'
      },
      {
        id: 'prod_requests',
        labelKey: 'nav.requests',
        descKey: 'permissions.matrix.pageDesc.production_requests',
        pagePerm: 'production_requests'
      },
      {
        id: 'prod_scratches',
        labelKey: 'nav.scratches',
        descKey: 'permissions.matrix.pageDesc.production_scratches',
        pagePerm: 'production_scratches'
      },
      {
        id: 'prod_equipment',
        labelKey: 'nav.equipment',
        descKey: 'permissions.matrix.pageDesc.production_equipment',
        pagePerm: 'production_equipment'
      },
      {
        id: 'prod_feedback',
        labelKey: 'nav.feedback',
        descKey: 'permissions.matrix.pageDesc.production_feedback',
        pagePerm: 'production_feedback'
      },
      {
        id: 'prod_settings',
        labelKey: 'nav.settings',
        descKey: 'permissions.matrix.pageDesc.production_settings',
        pagePerm: 'production_settings',
        actionModules: [{ moduleKey: 'settings' }],
        children: [
          { id: 'prod_set_admin', labelKey: 'settings.tabs.administrations', pagePerm: 'production_settings__administrations' },
          { id: 'prod_set_models', labelKey: 'settings.tabs.models', pagePerm: 'production_settings__models' },
          { id: 'prod_set_stations', labelKey: 'settings.tabs.stations', pagePerm: 'production_settings__stations' },
          { id: 'prod_set_colors', labelKey: 'settings.tabs.colors', pagePerm: 'production_settings__colors' },
          { id: 'prod_set_users', labelKey: 'settings.tabs.users', pagePerm: 'production_settings__users', actionModules: [{ moduleKey: 'users' }] }
        ]
      }
    ]
  },
  {
    id: 'dept_engineering',
    labelKey: 'permissions.matrix.depts.engineering',
    children: [
      {
        id: 'eng_home',
        labelKey: 'nav.home',
        descKey: 'permissions.matrix.pageDesc.engineering_home',
        pagePerm: 'engineering_home'
      },
      {
        id: 'eng_ipl',
        labelKey: 'nav.ipl',
        descKey: 'permissions.matrix.pageDesc.engineering_ipl',
        pagePerm: 'engineering_ipl',
        actionModules: [{ moduleKey: 'bom' }],
        children: [
          { id: 'eng_bom_parts', labelKey: 'bom.tabs.parts', pagePerm: 'engineering_ipl__parts' },
          { id: 'eng_bom_gd', labelKey: 'bom.tabs.partsGd', pagePerm: 'engineering_ipl__partsGd' },
          { id: 'eng_bom_cmp', labelKey: 'bom.tabs.compare', pagePerm: 'engineering_ipl__compare' },
          { id: 'eng_bom_cat', labelKey: 'bom.tabs.categories', pagePerm: 'engineering_ipl__categories' },
          { id: 'eng_bom_imp', labelKey: 'bom.tabs.import', pagePerm: 'engineering_ipl__import' },
          { id: 'eng_bom_dash', labelKey: 'bom.tabs.dashboard', pagePerm: 'engineering_ipl__dashboard' }
        ]
      },
      {
        id: 'eng_lb',
        labelKey: 'nav.lineBalancing',
        descKey: 'permissions.matrix.pageDesc.engineering_line_balancing',
        pagePerm: 'engineering_line_balancing',
        actionModules: [{ moduleKey: 'station_operations' }],
        children: [
          { id: 'eng_lb_ops', labelKey: 'lineBalancing.tabs.operations', pagePerm: 'engineering_line_balancing__operations' },
          { id: 'eng_lb_parts', labelKey: 'lineBalancing.tabs.opParts', pagePerm: 'engineering_line_balancing__opParts' },
          { id: 'eng_lb_ts', labelKey: 'lineBalancing.tabs.timeStudy', pagePerm: 'engineering_line_balancing__timeStudy' },
          { id: 'eng_lb_rt', labelKey: 'lineBalancing.tabs.routing', pagePerm: 'engineering_line_balancing__routing' },
          { id: 'eng_lb_mp', labelKey: 'lineBalancing.tabs.manpower', pagePerm: 'engineering_line_balancing__manpower' },
          { id: 'eng_lb_imp', labelKey: 'lineBalancing.tabs.import', pagePerm: 'engineering_line_balancing__import' }
        ]
      },
      {
        id: 'eng_sop',
        labelKey: 'nav.sop',
        descKey: 'permissions.matrix.pageDesc.engineering_sop',
        pagePerm: 'engineering_sop'
      },
      {
        id: 'eng_stations',
        labelKey: 'nav.stations',
        descKey: 'permissions.matrix.pageDesc.engineering_stations',
        pagePerm: 'engineering_stations',
        actionModules: [{ moduleKey: 'stations' }]
      }
    ]
  },
  {
    id: 'dept_warehouses',
    labelKey: 'permissions.matrix.depts.warehouses',
    children: [
      {
        id: 'wh_home',
        labelKey: 'nav.home',
        descKey: 'permissions.matrix.pageDesc.warehouses_home',
        pagePerm: 'warehouses_home'
      },
      {
        id: 'wh_stock',
        labelKey: 'warehouses.tabs.currentStock',
        descKey: 'permissions.matrix.pageDesc.warehouses_stock',
        pagePerm: 'warehouses_stock',
        actionModules: [{ moduleKey: 'inventory' }]
      },
      {
        id: 'wh_feed',
        labelKey: 'warehouses.tabs.feeding',
        descKey: 'permissions.matrix.pageDesc.warehouses_feeding',
        pagePerm: 'warehouses_feeding',
        children: [
          { id: 'wh_feed_plan', labelKey: 'warehouses.feeding.subTabs.plan', pagePerm: 'warehouses_feeding__plan' },
          { id: 'wh_feed_actual', labelKey: 'warehouses.feeding.subTabs.actual', pagePerm: 'warehouses_feeding__actual' }
        ]
      }
    ]
  },
  {
    id: 'dept_quality',
    labelKey: 'permissions.matrix.depts.quality',
    children: [
      {
        id: 'quality_notes',
        labelKey: 'qualityNotes.title',
        pagePerm: 'quality_notes',
        actionModules: [{ moduleKey: 'qc' }],
        children: [
          { id: 'quality_record', labelKey: 'qualityNotes.tabs.record', pagePerm: 'quality_notes__record' },
          { id: 'quality_study', labelKey: 'qualityNotes.tabs.study', pagePerm: 'quality_notes__study' }
        ]
      }
    ]
  },
  {
    id: 'dept_hr',
    labelKey: 'permissions.matrix.depts.hr',
    children: [
      {
        id: 'hr_workforce',
        labelKey: 'permissions.matrix.hrWorkforce',
        descKey: 'permissions.matrix.moduleDesc.organizational_structure',
        actionModules: [{ moduleKey: 'employees' }, { moduleKey: 'organizational_structure' }]
      }
    ]
  },
  {
    id: 'dept_system',
    labelKey: 'permissions.matrix.depts.system',
    children: [
      {
        id: 'sys_dashboard',
        labelKey: 'permissions.modules.dashboard',
        descKey: 'permissions.matrix.moduleDesc.dashboard',
        actionModules: [{ moduleKey: 'dashboard' }]
      },
      {
        id: 'sys_reports',
        labelKey: 'permissions.modules.reports',
        descKey: 'permissions.matrix.moduleDesc.reports',
        actionModules: [{ moduleKey: 'reports' }]
      }
    ]
  }
]

export function parentPagePerm(pagePerm: string): AppPagePermissionKey | null {
  const idx = pagePerm.indexOf('__')
  if (idx === -1) return pagePerm as AppPagePermissionKey
  return pagePerm.slice(0, idx) as AppPagePermissionKey
}
