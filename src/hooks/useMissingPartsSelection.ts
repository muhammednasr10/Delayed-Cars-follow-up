import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { MissingPartsListTab } from '../Types/missingPart'
import { partsFromTableRow, vehicleIdsFromTableRow, type MissingPartTableRow } from '../Utils/missingPartDisplay'

export function useMissingPartsSelection(opts: {
  tableRows: MissingPartTableRow[]
  listTab: MissingPartsListTab
  canBulkSelectForTab: boolean
  selectedVehicleIds: Set<string>
  setSelectedVehicleIds: Dispatch<SetStateAction<Set<string>>>
}) {
  const { tableRows, listTab, canBulkSelectForTab, selectedVehicleIds, setSelectedVehicleIds } = opts

  const selectableVehicleIds = useMemo(() => {
    if (!canBulkSelectForTab || (listTab !== 'active' && listTab !== 'history')) return new Set<string>()
    const ids = new Set<string>()
    for (const row of tableRows) {
      const parts = partsFromTableRow(row).filter(p => {
        if (listTab === 'history') return !!p.shortageResolvedAt
        return p.status !== 'closed' && p.status !== 'cancelled' && !p.shortageResolvedAt
      })
      if (parts.length === 0) continue
      for (const id of vehicleIdsFromTableRow(row)) ids.add(id)
    }
    return ids
  }, [tableRows, canBulkSelectForTab, listTab])

  const allSelectableSelected =
    selectableVehicleIds.size > 0 && [...selectableVehicleIds].every(id => selectedVehicleIds.has(id))
  const someSelectableSelected = [...selectableVehicleIds].some(id => selectedVehicleIds.has(id))

  function toggleRowSelection(tableRow: MissingPartTableRow) {
    const ids = vehicleIdsFromTableRow(tableRow).filter(id => selectableVehicleIds.has(id))
    if (ids.length === 0) return
    setSelectedVehicleIds(prev => {
      const next = new Set(prev)
      const allOn = ids.every(id => next.has(id))
      if (allOn) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  function toggleSelectAllVisible() {
    setSelectedVehicleIds(allSelectableSelected ? new Set() : new Set(selectableVehicleIds))
  }

  return {
    selectableVehicleIds,
    allSelectableSelected,
    someSelectableSelected,
    toggleRowSelection,
    toggleSelectAllVisible
  }
}
