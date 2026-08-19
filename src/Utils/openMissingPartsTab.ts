import type { AppNotificationItem } from '../Types/appNotification'
import type { MissingPartsListTab } from '../Types/missingPart'
import { OPEN_MISSING_PARTS_EVENT } from '../Types/appNotification'

export type OpenMissingPartsDetail = {
  tab?: MissingPartsListTab
  search?: string
}

export function missingPartsTabForNotification(item: AppNotificationItem): MissingPartsListTab {
  if (item.eventType === 'transfer_requested') return 'approvals'
  if (item.eventType === 'shortage_archived') return 'history'
  return 'active'
}

export function dispatchOpenMissingPartsTab(tab: MissingPartsListTab, search?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_MISSING_PARTS_EVENT, { detail: { tab, search } satisfies OpenMissingPartsDetail }))
}

export function productionNavigatePatch(page: 'missing' | 'missions' | 'requests') {
  return {
    department: 'production' as const,
    productionArea: 'assembly' as const,
    productionPage: page,
    showProfile: false,
    showGlobalHome: false,
    closeSidebar: true
  }
}
