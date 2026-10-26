import { useCallback, useEffect, useState } from 'react'
import { listAssignedIplPartIds, listLinkedHardwarePartKeys } from '../services/stationOperationsService'

export function useIplLineBalancingLinks() {
  const [assignedPartIds, setAssignedPartIds] = useState<Set<string>>(() => new Set())
  const [hardwarePartKeys, setHardwarePartKeys] = useState<Set<string>>(() => new Set())

  const reload = useCallback(() => {
    listAssignedIplPartIds()
      .then(setAssignedPartIds)
      .catch(() => setAssignedPartIds(new Set()))
    listLinkedHardwarePartKeys()
      .then(setHardwarePartKeys)
      .catch(() => setHardwarePartKeys(new Set()))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { assignedPartIds, hardwarePartKeys, reload }
}
