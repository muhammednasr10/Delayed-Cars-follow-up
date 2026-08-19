export const OPEN_MISSIONS_EVENT = 'afa:open-missions'

export type OpenMissionsTab = 'board' | 'my'

export type OpenMissionsDetail = {
  tab?: OpenMissionsTab
  search?: string
}

export function dispatchOpenMissionsTab(tab: OpenMissionsTab = 'board', search?: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_MISSIONS_EVENT, { detail: { tab, search } satisfies OpenMissionsDetail })
  )
}
