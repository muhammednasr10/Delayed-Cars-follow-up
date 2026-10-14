import type { NavigatePatch } from '../Context/NavigationContext'
import type { ActivityNotificationTarget } from './appNotificationCopy'
import { dispatchOpenMissingPartsTab, productionNavigatePatch } from './openMissingPartsTab'
import type { PushDestination } from './pushNotificationTarget'

type NotificationDestination = PushDestination | ActivityNotificationTarget

export function navigateNotificationDestination(
  navigate: (patch: NavigatePatch) => void,
  destination: NotificationDestination
) {
  if (destination.kind === 'missing') {
    navigate(productionNavigatePatch('missing'))
    queueMicrotask(() => dispatchOpenMissingPartsTab(destination.tab))
    return
  }
  if (destination.kind === 'missions') {
    navigate(productionNavigatePatch('missions'))
    return
  }
  if (destination.kind === 'planning') {
    navigate({
      department: 'planning',
      planningTab: destination.tab,
      planScope: destination.scope,
      showProfile: false,
      showGlobalHome: false,
      closeSidebar: true
    })
    return
  }
  if (destination.kind === 'scratches') {
    navigate({
      department: 'production',
      productionArea: 'assembly',
      productionPage: 'scratches',
      showProfile: false,
      showGlobalHome: false,
      closeSidebar: true
    })
    return
  }
  navigate({
    department: 'production',
    productionArea: 'assembly',
    productionPage: 'vehicles',
    productivityTab: destination.kind === 'stops' ? 'stops' : 'productivity',
    showProfile: false,
    showGlobalHome: false,
    closeSidebar: true
  })
}
