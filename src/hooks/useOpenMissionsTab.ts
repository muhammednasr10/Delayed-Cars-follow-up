import { useEffect } from 'react'
import { OPEN_MISSIONS_EVENT, type OpenMissionsDetail } from '../Utils/openMissionsTab'

export function useOpenMissionsTab(onOpen: (detail: OpenMissionsDetail) => void) {
  useEffect(() => {
    function onEvent(e: Event) {
      onOpen((e as CustomEvent<OpenMissionsDetail>).detail ?? {})
    }
    window.addEventListener(OPEN_MISSIONS_EVENT, onEvent)
    return () => window.removeEventListener(OPEN_MISSIONS_EVENT, onEvent)
  }, [onOpen])
}
