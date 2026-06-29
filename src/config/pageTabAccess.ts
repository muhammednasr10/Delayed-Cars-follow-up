import type { AppPagePermissionKey } from './pageAccess'

export function tabPagePermKey(parentPerm: AppPagePermissionKey, tabKey: string): string {
  return `${parentPerm}__${tabKey}`
}

export function resolveTabPagePerm(
  parentPerm: AppPagePermissionKey,
  tabKey: string,
  permissions: Record<string, boolean>,
  pagesConfigured: boolean,
  parentVisible: boolean
): boolean {
  const fullKey = `pages.${tabPagePermKey(parentPerm, tabKey)}`
  if (permissions[fullKey] === true) return true
  if (permissions[fullKey] === false) return false
  if (!pagesConfigured) return parentVisible
  return parentVisible
}
