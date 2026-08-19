import { useCallback } from 'react'
import { useNavigation } from '../Context/NavigationContext'
import type { TeamMission } from '../Types/mission'
import { dispatchOpenMissingPartsTab, productionNavigatePatch } from '../Utils/openMissingPartsTab'

export function useOpenMissionShortage(onCloseDetail: () => void) {
  const nav = useNavigation()
  return useCallback(
    (row: TeamMission) => {
      const vin = row.sourceVin?.trim()
      if (!vin) return
      onCloseDetail()
      nav.navigate(productionNavigatePatch('missing'))
      queueMicrotask(() => dispatchOpenMissingPartsTab('active', vin))
    },
    [nav, onCloseDetail]
  )
}
