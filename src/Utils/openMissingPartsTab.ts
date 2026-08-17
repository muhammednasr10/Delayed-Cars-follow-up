import type { AppNotificationItem } from '../Types/appNotification'
import type { MissingPartsListTab } from '../Types/missingPart'
import { OPEN_MISSING_PARTS_EVENT } from '../Types/appNotification'

export function missingPartsTabForNotification(item: AppNotificationItem): MissingPartsListTab {
  if (item.eventType === 'transfer_requested') return 'approvals'
  if (item.eventType === 'shortage_archived') return 'history'
  return 'active'
}

export function dispatchOpenMissingPartsTab(tab: MissingPartsListTab) {
  window.dispatchEvent(new CustomEvent(OPEN_MISSING_PARTS_EVENT, { detail: { tab } }))
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
