import { useEffect, useMemo, useState } from 'react'
import type { BomItemDetail } from '../Types/bom'
import type { ParentStationOperationsGroup } from '../Types/timeStudy'
import { getActiveBomRowsForHardwareRefs, getActiveBomRowsForPartIds } from '../services/bomService'
import { fetchIplFittedPartsByStation } from '../services/iplStationPartsService'
import { iplPartIdFromNotes, type IplStationPart } from '../Utils/iplStationParts'

function collectIplPartIds(parentGroups: ParentStationOperationsGroup[]): string[] {
  const ids = new Set<string>()
  for (const parent of parentGroups) {
    for (const worker of parent.workers) {
      for (const operation of worker.operations) {
        const id = iplPartIdFromNotes(operation.notes)
        if (id) ids.add(id)
      }
    }
  }
  return [...ids].sort()
}

function collectHardwareRefs(parentGroups: ParentStationOperationsGroup[]): {
  partNumbers: string[]
  partNames: string[]
  key: string
} {
  const partNumbers = new Set<string>()
  const partNames = new Set<string>()
  for (const parent of parentGroups) {
    for (const worker of parent.workers) {
      for (const operation of worker.operations) {
        for (const item of operation.hardware) {
          if (item.hardwareName.trim()) partNumbers.add(item.hardwareName.trim())
          if (item.hardwareSize?.trim()) partNames.add(item.hardwareSize.trim())
        }
      }
    }
  }
  const numbers = [...partNumbers].sort()
  const names = [...partNames].sort()
  return {
    partNumbers: numbers,
    partNames: names,
    key: `${numbers.join('\u0001')}::${names.join('\u0001')}`
  }
}

/** BOM compare rows + fitted IPL parts for the station operations tab. */
export function useStationOpsCompareData(
  parentGroups: ParentStationOperationsGroup[],
  activeVariant: string
): {
  bomByPartId: Map<string, BomItemDetail[]>
  hardwareBomRows: BomItemDetail[]
  iplByStation: Record<string, IplStationPart[]>
} {
  const [bomByPartId, setBomByPartId] = useState<Map<string, BomItemDetail[]>>(() => new Map())
  const [hardwareBomRows, setHardwareBomRows] = useState<BomItemDetail[]>([])
  const [iplByStation, setIplByStation] = useState<Record<string, IplStationPart[]>>({})

  const iplPartIds = useMemo(() => collectIplPartIds(parentGroups), [parentGroups])
  const hardwareRefKey = useMemo(() => collectHardwareRefs(parentGroups), [parentGroups])

  useEffect(() => {
    if (iplPartIds.length === 0) {
      setBomByPartId(new Map())
      return
    }
    let cancelled = false
    getActiveBomRowsForPartIds(iplPartIds)
      .then(rows => {
        if (cancelled) return
        const next = new Map<string, BomItemDetail[]>()
        for (const row of rows) {
          if (!row.part_id) continue
          const list = next.get(row.part_id) ?? []
          list.push(row)
          next.set(row.part_id, list)
        }
        setBomByPartId(next)
      })
      .catch(() => {
        if (!cancelled) setBomByPartId(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [iplPartIds])

  useEffect(() => {
    if (hardwareRefKey.partNumbers.length === 0 && hardwareRefKey.partNames.length === 0) {
      setHardwareBomRows([])
      return
    }
    let cancelled = false
    getActiveBomRowsForHardwareRefs({
      partNumbers: hardwareRefKey.partNumbers,
      partNames: hardwareRefKey.partNames
    })
      .then(rows => {
        if (!cancelled) setHardwareBomRows(rows)
      })
      .catch(() => {
        if (!cancelled) setHardwareBomRows([])
      })
    return () => {
      cancelled = true
    }
  }, [hardwareRefKey.key, hardwareRefKey.partNames, hardwareRefKey.partNumbers])

  useEffect(() => {
    if (!activeVariant) {
      setIplByStation({})
      return
    }
    let cancelled = false
    fetchIplFittedPartsByStation(activeVariant)
      .then(grouped => {
        if (cancelled) return
        setIplByStation(Object.fromEntries(grouped))
      })
      .catch(() => {
        if (!cancelled) setIplByStation({})
      })
    return () => {
      cancelled = true
    }
  }, [activeVariant])

  return { bomByPartId, hardwareBomRows, iplByStation }
}
