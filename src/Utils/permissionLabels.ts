type TFn = (key: string) => string

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
