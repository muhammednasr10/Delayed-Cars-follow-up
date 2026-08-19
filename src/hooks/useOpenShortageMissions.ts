import { useCallback } from 'react'
import { useNavigation } from '../Context/NavigationContext'
import { dispatchOpenMissionsTab } from '../Utils/openMissionsTab'
import { productionNavigatePatch } from '../Utils/openMissingPartsTab'

export function useOpenShortageMissions() {
  const nav = useNavigation()
  return useCallback(
    (search: string) => {
      const q = search.trim()
      if (!q) return
      nav.navigate(productionNavigatePatch('missions'))
      queueMicrotask(() => dispatchOpenMissionsTab('board', q))
    },
    [nav]
  )
}
