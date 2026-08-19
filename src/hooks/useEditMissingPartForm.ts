import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useMpLookups } from './useMpLookups'
import { useEmployees } from './useEmployees'
import { useMissingPartsUiPermissions } from './useMissingPartsUiPermissions'
import { useFormatError } from './useFormatError'
import { useVinListConflict } from './useVinListConflict'
import { reportMissingPartsBatch, updateMissingPartRecord, deleteMissingPartRecord, attachMissingPartsToReportGroup } from '../services/missingPartsService'
import { updateVehicle } from '../services/vehiclesService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import { resolveFamilyIdForVariant } from '../Components/VehicleModelFamilyPicker'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'
import { isValidVinLength } from '../Utils/vinValidation'
import { normalizeVinKey } from '../Utils/vinListConflict'
import type { VehicleIssuesContext, MissingPartDetail } from '../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../Types/settings'

export type ExistingLine = {
  part: MissingPartDetail
  partItems: string[]
  requiredQty: number
  reason: string
  department: string
  notes: string
  completingDepartment: string
  followUpEmployeeId: string
  followUpEmployeeIds: string[]
}

export type NewIssue = {
  key: string
  partItems: string[]
  reason: string
  department: string
  completingDepartment: string
  followUpEmployeeId: string
  followUpEmployeeIds: string[]
}

export function filledPartItems(items: string[]): string[] {
  return items.map(s => s.trim()).filter(Boolean)
}

function lineChanged(d: ExistingLine): boolean {
  const p = d.part
  const filled = filledPartItems(d.partItems)
  const primary = (filled[0] ?? '').trim()
  return (
    primary !== p.partDescription ||
    filled.length > 1 ||
    d.requiredQty !== p.requiredQty ||
    d.reason !== p.reason ||
    d.department !== p.department ||
    (d.completingDepartment || '') !== (p.completingDepartment ?? '') ||
    (d.followUpEmployeeIds ?? []).join(',') !== (p.followUpEmployeeIds ?? []).join(',') ||
    (d.notes.trim() || '') !== (p.notes ?? '')
  )
}

function newIssueDraft(reason: string, department: string): NewIssue {
  return {
    key: crypto.randomUUID(),
    partItems: [''],
    reason,
    department,
    completingDepartment: '',
    followUpEmployeeId: '',
    followUpEmployeeIds: []
  }
}

type Params = {
  vehicle: VehicleIssuesContext | null
  activeListParts?: MissingPartDetail[]
  onSaved: () => void
  onClose: () => void
}

export function useEditMissingPartForm({ vehicle, activeListParts = [], onSaved, onClose }: Params) {
  const { t } = useLang()
  const { reasons, departments, orgUnits, addReason } = useMpLookups()
  const { employees } = useEmployees()
  const { canAssignFollowUp } = useMissingPartsUiPermissions()
  const formatError = useFormatError()

  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [colorId, setColorId] = useState<string | null>(null)
  const [vin, setVin] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ExistingLine[]>([])
  const [newIssues, setNewIssues] = useState<NewIssue[]>([])
  const [extraVins, setExtraVins] = useState<string[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openParts = useMemo(
    () =>
      vehicle?.parts.filter(p => vehicle.allowArchived || (p.status !== 'closed' && p.status !== 'cancelled')) ?? [],
    [vehicle]
  )
  const ownedPartIds = useMemo(() => new Set(openParts.map(p => p.id)), [openParts])
  const ownedVins = useMemo(
    () => (vehicle ? new Set([normalizeVinKey(vehicle.vin)]) : new Set<string>()),
    [vehicle]
  )
  const vinConflict = useVinListConflict({ activeListParts, ownedPartIds, ownedVins })

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      setNewIssues([])
      setExtraVins([])
      vinConflict.reset()
      return
    }
    setVin(vehicle.vin)
    setNotes(openParts[0]?.notes ?? '')
    setLines(
      openParts.map(p => ({
        part: p,
        partItems: [p.partDescription],
        requiredQty: p.requiredQty,
        reason: p.reason,
        department: p.department,
        notes: p.notes ?? '',
        completingDepartment: p.completingDepartment ?? '',
        followUpEmployeeId: p.followUpEmployeeId ?? '',
        followUpEmployeeIds: p.followUpEmployeeIds ?? (p.followUpEmployeeId ? [p.followUpEmployeeId] : [])
      }))
    )
    setNewIssues([])
    setExtraVins([])
    setRemovedIds([])
    vinConflict.reset()
    setError('')
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
        const byName = m.find(x => x.name === vehicle.modelName && x.model_kind === 'variant')
          ?? m.find(x => x.name === vehicle.modelName)
        const mid = byName?.id ?? ''
        setModelId(mid)
        setFamilyId(resolveFamilyIdForVariant(m, mid) || byName?.parent_model_id || '')
        const color = c.find(x => x.name === vehicle.colorName)
        setColorId(color?.id ?? null)
      })
      .catch(err => setError(formatError(err)))
      .finally(() => setListsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, openParts, formatError])

  const changedLines = lines.filter(lineChanged)
  const filledNewIssues = newIssues.filter(i => filledPartItems(i.partItems).length > 0)
  const filledExtraVins = extraVins.map(v => normalizeVinKey(v)).filter(isValidVinLength)
  const vinChanged = vehicle ? normalizeVinKey(vin) !== normalizeVinKey(vehicle.vin) : false
  const originalColor = colors.find(c => c.name === vehicle?.colorName)
  const colorChanged = (colorId || null) !== (originalColor?.id ?? null)
  const originalModel = models.find(m => m.name === vehicle?.modelName)
  const modelChanged = Boolean(modelId) && modelId !== (originalModel?.id ?? '')

  const hasChanges =
    changedLines.length > 0 ||
    filledNewIssues.length > 0 ||
    filledExtraVins.length > 0 ||
    removedIds.length > 0 ||
    vinChanged ||
    colorChanged ||
    modelChanged ||
    notes.trim() !== (openParts[0]?.notes ?? '').trim()

  function patchLine(partId: string, patch: Partial<ExistingLine>) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, ...patch } : l)))
  }

  function removeExistingLine(line: ExistingLine) {
    const label = filledPartItems(line.partItems)[0] || line.part.partDescription
    if (!window.confirm(t('mp.deleteConfirm', { part: label }))) return
    setRemovedIds(prev => [...prev, line.part.id])
    setLines(prev => prev.filter(l => l.part.id !== line.part.id))
  }

  function updateLinePartItem(partId: string, index: number, value: string) {
    setLines(prev =>
      prev.map(l =>
        l.part.id === partId
          ? { ...l, partItems: l.partItems.map((item, i) => (i === index ? value : item)) }
          : l
      )
    )
  }

  function addLinePartItem(partId: string) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, partItems: [...l.partItems, ''] } : l)))
  }

  function removeLinePartItem(partId: string, index: number) {
    setLines(prev =>
      prev.map(l => {
        if (l.part.id !== partId || l.partItems.length <= 1) return l
        return { ...l, partItems: l.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function updateNewIssuePartItem(key: string, index: number, value: string) {
    setNewIssues(prev =>
      prev.map(issue =>
        issue.key === key
          ? { ...issue, partItems: issue.partItems.map((item, i) => (i === index ? value : item)) }
          : issue
      )
    )
  }

  function addNewIssuePartItem(key: string) {
    setNewIssues(prev =>
      prev.map(issue => (issue.key === key ? { ...issue, partItems: [...issue.partItems, ''] } : issue))
    )
  }

  function removeNewIssuePartItem(key: string, index: number) {
    setNewIssues(prev =>
      prev.map(issue => {
        if (issue.key !== key || issue.partItems.length <= 1) return issue
        return { ...issue, partItems: issue.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function addExistingStyleIssue() {
    setNewIssues(prev => [
      ...prev,
      newIssueDraft(defaultReasonCode(reasons) || lines[0]?.reason || '', defaultDepartmentCode(departments) || lines[0]?.department || '')
    ])
  }

  function patchNewIssue(key: string, patch: Partial<NewIssue>) {
    setNewIssues(prev => prev.map(x => (x.key === key ? { ...x, ...patch } : x)))
  }

  function removeNewIssue(key: string) {
    setNewIssues(prev => prev.filter(x => x.key !== key))
  }

  async function saveAll() {
    if (!vehicle) return
    const ctx = vehicle
    const nextVin = normalizeVinKey(vin)
    if (!isValidVinLength(nextVin)) {
      setError(t('mp.errVinIndex', { n: 1 }))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    for (const line of changedLines) {
      const filled = filledPartItems(line.partItems)
      if (filled.length === 0) {
        setError(t('mp.edit.partRequired'))
        return
      }
      if (line.requiredQty < Math.max(1, line.part.installedQty)) {
        setError(t('mp.edit.qtyBelowInstalled'))
        return
      }
    }
    for (const issue of filledNewIssues) {
      if (filledPartItems(issue.partItems).length === 0) {
        setError(t('mp.edit.partRequired'))
        return
      }
    }
    for (let i = 0; i < extraVins.length; i++) {
      const raw = normalizeVinKey(extraVins[i])
      if (raw && !isValidVinLength(raw)) {
        setError(t('mp.errVinIndex', { n: i + 1 }))
        return
      }
    }
    const allNewVins = filledExtraVins
    if (new Set([nextVin, ...allNewVins]).size !== 1 + allNewVins.length) {
      setError(t('mp.errDuplicateVin'))
      return
    }
    if (!hasChanges) {
      setError(t('mp.edit.nothingChanged'))
      return
    }

    if (vinConflict.requireResolved(allNewVins, extraVins)) {
      setError(t('mp.edit.vinConflictTitle'))
      return
    }

    setBusy(true)
    setError('')
    try {
      const sharedNotes = notes.trim()

      for (const id of removedIds) {
        await deleteMissingPartRecord(id)
      }
      for (const id of vinConflict.clearPartIds(allNewVins)) {
        await deleteMissingPartRecord(id)
      }

      if (vinChanged || modelChanged || colorChanged) {
        await updateVehicle(ctx.vehicleId, {
          vin: nextVin,
          modelId,
          vehicleColorId: colorId
        })
      }

      for (const line of changedLines) {
        const filled = filledPartItems(line.partItems)
        await updateMissingPartRecord(line.part.id, {
          partDescription: filled[0],
          requiredQty: Math.max(1, line.requiredQty),
          reason: line.reason,
          department: line.department,
          priority: line.part.priority,
          stopperType: line.part.stopperType,
          notes: sharedNotes || line.notes,
          completingDepartment: line.completingDepartment || null,
          followUpEmployeeId: line.followUpEmployeeIds?.[0] || line.followUpEmployeeId || null,
          followUpEmployeeIds: line.followUpEmployeeIds,
          assignFollowUp: canAssignFollowUp
        })
      }

      if (sharedNotes !== (openParts[0]?.notes ?? '').trim()) {
        for (const line of lines) {
          if (changedLines.some(c => c.part.id === line.part.id)) continue
          const filled = filledPartItems(line.partItems)
          await updateMissingPartRecord(line.part.id, {
            partDescription: filled[0] || line.part.partDescription,
            requiredQty: Math.max(1, line.requiredQty),
            reason: line.reason,
            department: line.department,
            priority: line.part.priority,
            stopperType: line.part.stopperType,
            notes: sharedNotes,
            completingDepartment: line.completingDepartment || null,
            followUpEmployeeId: line.followUpEmployeeIds?.[0] || line.followUpEmployeeId || null,
            followUpEmployeeIds: line.followUpEmployeeIds,
            assignFollowUp: canAssignFollowUp
          })
        }
      }

      const extraFromExisting = lines.flatMap(line => {
        const filled = filledPartItems(line.partItems)
        return filled.slice(1).map(partDescription => ({
          partDescription,
          requiredQty: 1,
          reason: line.reason,
          department: line.department,
          stationId: null as string | null,
          completingDepartment: line.completingDepartment || null,
          followUpEmployeeId: line.followUpEmployeeIds?.[0] || line.followUpEmployeeId || null,
          followUpEmployeeIds: line.followUpEmployeeIds
        }))
      })

      const newPartLines = [
        ...extraFromExisting,
        ...filledNewIssues.flatMap(i =>
          filledPartItems(i.partItems).map(partDescription => ({
            partDescription,
            requiredQty: 1,
            reason: i.reason,
            department: i.department,
            stationId: null as string | null,
            completingDepartment: i.completingDepartment || null,
            followUpEmployeeId: i.followUpEmployeeIds?.[0] || i.followUpEmployeeId || null,
            followUpEmployeeIds: i.followUpEmployeeIds
          }))
        )
      ]

      let reportGroupId = openParts.map(p => p.reportGroupId).find(Boolean) ?? null
      if (allNewVins.length > 0 && !reportGroupId) {
        reportGroupId = crypto.randomUUID()
        await attachMissingPartsToReportGroup(
          lines.map(l => l.part.id),
          reportGroupId
        )
      }

      if (newPartLines.length > 0) {
        await reportMissingPartsBatch({
          vins: [nextVin],
          modelId,
          parts: newPartLines,
          colorId,
          reason: newPartLines[0].reason,
          department: newPartLines[0].department,
          notes: sharedNotes || undefined,
          factoryOrgUnitId: ctx.parts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: reportGroupId ?? undefined
        })
      }

      if (allNewVins.length > 0) {
        const partsForNewVins = [
          ...lines.flatMap(l =>
            filledPartItems(l.partItems).map(partDescription => ({
              partDescription,
              requiredQty: 1,
              reason: l.reason,
              department: l.department,
              stationId: null as string | null,
              completingDepartment: l.completingDepartment || null,
              followUpEmployeeId: l.followUpEmployeeIds?.[0] || l.followUpEmployeeId || null,
              followUpEmployeeIds: l.followUpEmployeeIds
            }))
          ),
          ...filledNewIssues.flatMap(i =>
            filledPartItems(i.partItems).map(partDescription => ({
              partDescription,
              requiredQty: 1,
              reason: i.reason,
              department: i.department,
              stationId: null as string | null,
              completingDepartment: i.completingDepartment || null,
              followUpEmployeeId: i.followUpEmployeeIds?.[0] || i.followUpEmployeeId || null,
              followUpEmployeeIds: i.followUpEmployeeIds
            }))
          )
        ]
        if (partsForNewVins.length === 0) {
          setError(t('mp.edit.needIssueForNewVin'))
          setBusy(false)
          return
        }
        await reportMissingPartsBatch({
          vins: allNewVins,
          modelId,
          parts: partsForNewVins,
          colorId,
          reason: partsForNewVins[0].reason,
          department: partsForNewVins[0].department,
          notes: sharedNotes || undefined,
          factoryOrgUnitId: ctx.parts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: reportGroupId ?? undefined
        })
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(false)
    }
  }

  return {
    // lookups
    reasons, departments, orgUnits, addReason,
    employees, canAssignFollowUp,
    // vehicle fields
    models, colors, listsLoading,
    familyId, setFamilyId,
    modelId, setModelId,
    colorId, setColorId,
    vin, setVin,
    notes, setNotes,
    // lines
    lines, newIssues, openParts,
    filledNewIssues,
    // extra vins
    extraVins, setExtraVins,
    // vin conflict
    vinConflict,
    // status
    busy, error, hasChanges,
    // actions
    patchLine, removeExistingLine,
    updateLinePartItem, addLinePartItem, removeLinePartItem,
    updateNewIssuePartItem, addNewIssuePartItem, removeNewIssuePartItem,
    addExistingStyleIssue, patchNewIssue, removeNewIssue,
    saveAll
  }
}
