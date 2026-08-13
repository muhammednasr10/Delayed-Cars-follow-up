import { useCallback, useState } from 'react'
import type { MissingPartDetail } from '../Types/missingPart'
import {
  findUnresolvedVinConflict,
  normalizeVinKey,
  partIdsToClearFromList,
  vinInActiveList,
  type VinConflictChoice
} from '../Utils/vinListConflict'
import { isValidVinLength } from '../Utils/vinValidation'

type ConflictState = { vin: string; index: number }

type Options = {
  activeListParts: MissingPartDetail[]
  ownedPartIds: ReadonlySet<string>
  /** VINs already belonging to this edit — never prompt for them. */
  ownedVins: ReadonlySet<string>
}

/**
 * Shared move / keep / skip flow when adding a chassis that already exists
 * in the active shortages list.
 */
export function useVinListConflict({ activeListParts, ownedPartIds, ownedVins }: Options) {
  const [vinsToClear, setVinsToClear] = useState<Set<string>>(() => new Set())
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(() => new Set())
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  const reset = useCallback(() => {
    setVinsToClear(new Set())
    setResolvedConflicts(new Set())
    setConflict(null)
  }, [])

  const forgetDecision = useCallback((vinRaw: string) => {
    const key = normalizeVinKey(vinRaw)
    if (!key) return
    setVinsToClear(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setResolvedConflicts(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const promptIfNeeded = useCallback(
    (index: number, raw: string) => {
      const key = normalizeVinKey(raw)
      if (!isValidVinLength(key) || ownedVins.has(key) || conflict) return
      if (resolvedConflicts.has(key)) return
      if (!vinInActiveList(key, activeListParts, ownedPartIds)) return
      setConflict({ vin: key, index })
    },
    [activeListParts, ownedPartIds, ownedVins, resolvedConflicts, conflict]
  )

  const choose = useCallback(
    (choice: VinConflictChoice, onSkipRow: (index: number) => void) => {
      if (!conflict) return
      const { vin, index } = conflict
      setConflict(null)
      if (choice === 'skip') {
        onSkipRow(index)
        forgetDecision(vin)
        return
      }
      setResolvedConflicts(prev => new Set(prev).add(vin))
      setVinsToClear(prev => {
        const next = new Set(prev)
        if (choice === 'move') next.add(vin)
        else next.delete(vin)
        return next
      })
    },
    [conflict, forgetDecision]
  )

  /** Returns unresolved VIN key, or null if all clear. Also opens the dialog when needed. */
  const requireResolved = useCallback(
    (candidateVins: string[], rows: string[]): string | null => {
      const unresolved = findUnresolvedVinConflict(
        candidateVins,
        resolvedConflicts,
        activeListParts,
        ownedPartIds
      )
      if (!unresolved) return null
      const idx = rows.findIndex(x => normalizeVinKey(x) === unresolved)
      setConflict({ vin: unresolved, index: Math.max(0, idx) })
      return unresolved
    },
    [resolvedConflicts, activeListParts, ownedPartIds]
  )

  const clearPartIds = useCallback(
    (candidateVins: string[]) =>
      partIdsToClearFromList(vinsToClear, candidateVins, activeListParts, ownedPartIds),
    [vinsToClear, activeListParts, ownedPartIds]
  )

  return {
    conflictVin: conflict?.vin ?? null,
    reset,
    forgetDecision,
    promptIfNeeded,
    choose,
    requireResolved,
    clearPartIds
  }
}
