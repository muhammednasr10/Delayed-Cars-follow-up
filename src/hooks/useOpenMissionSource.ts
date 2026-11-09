import { useCallback } from 'react'
import { useNavigation } from '../Context/NavigationContext'
import type { TeamMission } from '../Types/mission'
import { dispatchOpenMissingPartsTab, productionNavigatePatch } from '../Utils/openMissingPartsTab'

/** Opens the source record linked to a mission (shortage / scratch / damaged / quality). */
export function useOpenMissionSource(onCloseDetail: () => void) {
  const nav = useNavigation()
  return useCallback(
    (row: TeamMission) => {
      onCloseDetail()

      if (row.sourceQualityNoteId) {
        nav.navigate({
          department: 'quality',
          qualityTab: 'study',
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }

      if (row.sourceInternalQualityId) {
        nav.navigate({
          department: 'production',
          productionArea: 'assembly',
          productionPage: 'internalQuality',
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }

      if (row.sourceDamagedPartId) {
        nav.navigate({
          department: 'production',
          productionArea: 'assembly',
          productionPage: 'damagedParts',
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }

      if (row.sourceScratchId) {
        nav.navigate({
          department: 'production',
          productionArea: 'assembly',
          productionPage: 'scratches',
          showProfile: false,
          showGlobalHome: false,
          closeSidebar: true
        })
        return
      }

      const vin = row.sourceVin?.trim()
      if (vin || row.sourceVehicleId || row.sourceMissingPartId) {
        nav.navigate(productionNavigatePatch('missing'))
        if (vin) queueMicrotask(() => dispatchOpenMissingPartsTab('active', vin))
      }
    },
    [nav, onCloseDetail]
  )
}
