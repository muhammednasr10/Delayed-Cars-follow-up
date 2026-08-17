import { useEffect } from 'react'
import { OPEN_MISSING_PARTS_EVENT } from '../Types/appNotification'
import type { MissingPartsListTab } from '../Types/missingPart'

export function useOpenMissingPartsTab(onTab: (tab: MissingPartsListTab) => void) {
  useEffect(() => {
    function onOpen(e: Event) {
      const tab = (e as CustomEvent<{ tab?: MissingPartsListTab }>).detail?.tab
      if (tab) onTab(tab)
    }
    window.addEventListener(OPEN_MISSING_PARTS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_MISSING_PARTS_EVENT, onOpen)
  }, [onTab])
}
