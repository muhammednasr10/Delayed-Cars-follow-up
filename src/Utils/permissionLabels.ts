type TFn = (key: string) => string

export const PERMISSION_ACTION_ORDER = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'import',
  'export',
  'print',
  'manage',
  'assign',
  'override'
] as const

export type PermissionActionKey = (typeof PERMISSION_ACTION_ORDER)[number]

export const PERMISSION_MODULE_GROUPS: { key: string; labelKey: string; modules: string[] }[] = [
  {
    key: 'pages',
    labelKey: 'permissions.matrix.groups.pages',
    modules: ['pages']
  },
  {
    key: 'core',
    labelKey: 'permissions.matrix.groups.core',
    modules: ['dashboard', 'reports', 'settings']
  },
  {
    key: 'people',
    labelKey: 'permissions.matrix.groups.people',
    modules: ['employees', 'organizational_structure', 'training_matrix', 'users']
  },
  {
    key: 'production',
    labelKey: 'permissions.matrix.groups.production',
    modules: ['stations', 'station_operations', 'bom', 'missing_parts', 'production', 'qc']
  },
  {
    key: 'inventory',
    labelKey: 'permissions.matrix.groups.inventory',
    modules: ['inventory']
  }
]

export function permissionModuleLabel(moduleKey: string, t: TFn): string {
  const key = `permissions.modules.${moduleKey}`
  const label = t(key)
  return label === key ? moduleKey : label
}

export function permissionActionLabel(actionKey: string, t: TFn): string {
  const key = `permissions.action.${actionKey}`
  const label = t(key)
  return label === key ? actionKey : label
}

export function formatPermissionLabel(moduleKey: string, actionKey: string, t: TFn): string {
  return `${permissionModuleLabel(moduleKey, t)} — ${permissionActionLabel(actionKey, t)}`
}

export function sortModuleKeys(keys: string[], t: TFn, locale: string): string[] {
  return [...keys].sort((a, b) =>
    permissionModuleLabel(a, t).localeCompare(permissionModuleLabel(b, t), locale)
  )
}

export function permissionActionDescription(actionKey: string, t: TFn): string {
  const key = `permissions.matrix.actionDesc.${actionKey}`
  const label = t(key)
  return label === key ? '' : label
}

export function permissionModuleDescription(moduleKey: string, t: TFn): string {
  const key = `permissions.matrix.moduleDesc.${moduleKey}`
  const label = t(key)
  return label === key ? '' : label
}

export function groupModulesForMatrix(
  moduleKeys: string[],
  t: TFn,
  locale: string
): { groupKey: string; groupLabel: string; modules: string[] }[] {
  const remaining = new Set(moduleKeys)
  const out: { groupKey: string; groupLabel: string; modules: string[] }[] = []

  for (const g of PERMISSION_MODULE_GROUPS) {
    const mods = g.modules.filter(m => remaining.has(m))
    mods.forEach(m => remaining.delete(m))
    if (mods.length > 0) {
      out.push({ groupKey: g.key, groupLabel: t(g.labelKey), modules: mods })
    }
  }

  if (remaining.size > 0) {
    out.push({
      groupKey: 'other',
      groupLabel: t('permissions.matrix.groups.other'),
      modules: sortModuleKeys([...remaining], t, locale)
    })
  }

  return out
}

export function sortActionsForMatrix(actions: string[]): string[] {
  const order = new Map(PERMISSION_ACTION_ORDER.map((a, i) => [a, i]))
  return [...actions].sort((a, b) => (order.get(a as PermissionActionKey) ?? 99) - (order.get(b as PermissionActionKey) ?? 99))
}
