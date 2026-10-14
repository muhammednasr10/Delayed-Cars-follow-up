import type { AppPagePermissionKey } from './pageAccess'

const PRODUCTIVITY_TABS = ['entry', 'exit', 'stops', 'productivity'] as const

/** صفحة الإنتاجية تظهر لو الصفحة نفسها مفتوحة أو أي تبويب تسجيل تحتها مفتوح. */
export function canOpenProductivityPage(
  canViewPage: (key: AppPagePermissionKey | undefined) => boolean,
  canViewTab: (parent: AppPagePermissionKey, tab: string) => boolean
): boolean {
  if (canViewPage('production_productivity')) return true
  return PRODUCTIVITY_TABS.some(tab => canViewTab('production_productivity', tab))
}

export function homeProductivityCardVisible(card: string | undefined, allowed: boolean, recorder: boolean): boolean {
  if (recorder && (card === 'production_home__entry' || card === 'production_home__exit')) return true
  return allowed
}

export function productivityNavVisible(
  canViewPage: (key: AppPagePermissionKey | undefined) => boolean,
  canViewTab: (parent: AppPagePermissionKey, tab: string) => boolean,
  recorder: boolean
): boolean {
  return recorder || canOpenProductivityPage(canViewPage, canViewTab)
}

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
  const normalizedTab = tabKey === 'productivity' ? 'summary' : tabKey === 'repair' ? 'exit' : tabKey
  const fullKey = `pages.${tabPagePermKey(parentPerm, normalizedTab)}`
  if (permissions[fullKey] === true) return true
  if (permissions[fullKey] === false) return false
  if (!pagesConfigured) return parentVisible
  return parentVisible
}
