import { useEffect } from 'react'
import { OPEN_MISSING_PARTS_EVENT } from '../Types/appNotification'
import type { OpenMissingPartsDetail } from '../Utils/openMissingPartsTab'

export function useOpenMissingPartsTab(onOpen: (detail: OpenMissingPartsDetail) => void) {
  useEffect(() => {
    function onEvent(e: Event) {
      onOpen((e as CustomEvent<OpenMissingPartsDetail>).detail ?? {})
    }
    window.addEventListener(OPEN_MISSING_PARTS_EVENT, onEvent)
    return () => window.removeEventListener(OPEN_MISSING_PARTS_EVENT, onEvent)
  }, [onOpen])
}
