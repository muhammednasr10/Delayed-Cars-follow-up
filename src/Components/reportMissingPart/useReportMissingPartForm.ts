import { useEffect, useRef, useState } from 'react'
import { useEmployees } from '../../hooks/useEmployees'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useFormatError } from '../../hooks/useFormatError'
import { useMpLookups } from '../../hooks/useMpLookups'
import { useMissingPartsUiPermissions } from '../../hooks/useMissingPartsUiPermissions'
import { useLang } from '../../i18n/LanguageContext'
import { getVehicleColors, getVehicleModels } from '../../services/settingsService'
import { findExistingVehicleVins, getMissingPartsByVins, reportMissingPartsBatch } from '../../services/missingPartsService'
import { defaultDepartmentCode, defaultReasonCode, isStockShortageReason } from '../../Utils/mpLookupLabel'
import { isValidVinLength, normalizeChassisVin } from '../../Utils/vinValidation'
import { duplicateVinIndices } from '../../Utils/vinListConflict'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../../Types/settings'
import {
  type IssueLineDraft,
  type VehicleForm,
  type DuplicatePrompt,
  emptyVehicle,
  newIssueLine,
  issuePartDescriptions,
  resizeVins
} from './types'

export function useReportMissingPartForm(
  open: boolean,
  onClose: () => void,
  onReported?: (summary?: string) => void
) {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { scopeRootId, scopeLabel } = useFactoryOrgScope(employees)
  const { reasons, departments, orgUnits, addReason } = useMpLookups()
  const { canAssignFollowUp } = useMissingPartsUiPermissions()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [issues, setIssues] = useState(() => [newIssueLine()])
  const [vehicle, setVehicle] = useState<VehicleForm>(emptyVehicle)
  const [vehicleCountDraft, setVehicleCountDraft] = useState('1')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicatePrompt | null>(null)
  const [confirmedExistingVins, setConfirmedExistingVins] = useState<Set<string>>(() => new Set())
  const [existingVehicleParts, setExistingVehicleParts] = useState<MissingPartDetail[] | null>(null)
  const [existingVehicleLoading, setExistingVehicleLoading] = useState(false)
  const [existingViewError, setExistingViewError] = useState('')
  const issuesSectionRef = useRef<HTMLElement>(null)

  const selectedModelName = models.find(m => m.id === vehicle.modelId)?.name ?? ''

  useEffect(() => {
    if (!open || reasons.length === 0 || departments.length === 0) return
    setIssues(prev =>
      prev.map(l => ({
        ...l,
        reason: l.reason || defaultReasonCode(reasons),
        department: l.department || defaultDepartmentCode(departments)
      }))
    )
  }, [open, reasons, departments])

  useEffect(() => {
    if (!open) return
    setIssues([
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
    setVehicle(emptyVehicle)
    setVehicleCountDraft('1')
    setFormError('')
    setDuplicatePrompt(null)
    setConfirmedExistingVins(new Set())
    setExistingVehicleParts(null)
    setExistingViewError('')
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
      })
      .catch(err => setFormError(formatError(err)))
      .finally(() => setListsLoading(false))
  }, [open, formatError, reasons, departments])

  function patchIssue(key: string, patch: Partial<IssueLineDraft>) {
    setIssues(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function patchIssueReason(key: string, code: string) {
    setIssues(prev =>
      prev.map(line => {
        if (line.key !== key) return line
        const filled = issuePartDescriptions(line)
        return {
          ...line,
          reason: code,
          partItems: filled.length > 0 ? filled : ['']
        }
      })
    )
  }

  function updatePartItem(key: string, index: number, value: string) {
    setIssues(prev =>
      prev.map(line =>
        line.key === key ? { ...line, partItems: line.partItems.map((item, i) => (i === index ? value : item)) } : line
      )
    )
  }

  function addPartItem(key: string) {
    setIssues(prev => prev.map(line => (line.key === key ? { ...line, partItems: [...line.partItems, ''] } : line)))
  }

  function removePartItem(key: string, index: number) {
    setIssues(prev =>
      prev.map(line => {
        if (line.key !== key || line.partItems.length <= 1) return line
        return { ...line, partItems: line.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function setVehicleCount(n: number) {
    const count = Math.max(1, Math.min(20, n))
    setVehicle(prev => ({ ...prev, vehicleCount: count, vins: resizeVins(count, prev.vins) }))
    setVehicleCountDraft(String(count))
  }

  function onVehicleCountChange(raw: string) {
    if (raw.trim() === '') {
      setVehicleCountDraft('')
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    const clamped = Math.min(20, Math.floor(n))
    if (clamped < 1) {
      setVehicleCountDraft(raw.replace(/[^\d]/g, '').slice(0, 2))
      return
    }
    setVehicleCount(clamped)
  }

  function onVehicleCountBlur() {
    const n = Math.max(1, Math.min(20, Number(vehicleCountDraft) || 1))
    setVehicleCount(n)
  }

  function updateVehicleVin(index: number, value: string) {
    const normalized = value.replace(/\D/g, '').slice(0, 4)
    const oldVin = vehicle.vins[index]?.toUpperCase()
    if (oldVin && oldVin !== normalized) {
      setConfirmedExistingVins(prev => {
        const next = new Set(prev)
        next.delete(oldVin)
        return next
      })
    }
    setVehicle(prev => ({ ...prev, vins: prev.vins.map((v, i) => (i === index ? normalized : v)) }))
  }

  function addIssue() {
    setIssues(prev => [
      ...prev,
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
  }

  function removeIssue(key: string) {
    setIssues(prev => (prev.length <= 1 ? prev : prev.filter(l => l.key !== key)))
  }

  async function checkVinDuplicate(index: number) {
    const vin = normalizeChassisVin(vehicle.vins[index]).toUpperCase()
    if (!vehicle.modelId || !isValidVinLength(vin) || confirmedExistingVins.has(vin)) return

    try {
      const existing = await findExistingVehicleVins([vin], vehicle.modelId)
      if (existing.length === 0) return
      setDuplicatePrompt({ vins: existing, vinIndex: index })
    } catch (err) {
      setFormError(formatError(err))
    }
  }

  function focusIssuesSection() {
    issuesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function viewExistingVehicle() {
    if (!duplicatePrompt) return
    setExistingVehicleLoading(true)
    setExistingViewError('')
    try {
      const all = await getMissingPartsByVins(duplicatePrompt.vins)
      const firstVin = duplicatePrompt.vins[0]?.toUpperCase() ?? ''
      const parts = all.filter(p => p.vin.toUpperCase() === firstVin)
      if (parts.length === 0) {
        setExistingViewError(t('mp.duplicateVehicleNoParts'))
        return
      }
      setExistingVehicleParts(parts)
    } catch (err) {
      setExistingViewError(formatError(err))
    } finally {
      setExistingVehicleLoading(false)
    }
  }

  function confirmAddToExisting() {
    if (!duplicatePrompt) return
    const normalized = duplicatePrompt.vins.map(v => v.toUpperCase())
    setConfirmedExistingVins(prev => new Set([...prev, ...normalized]))
    const pendingSubmit = duplicatePrompt.pendingSubmit
    setDuplicatePrompt(null)
    setExistingVehicleParts(null)
    setExistingViewError('')
    if (pendingSubmit) {
      void submit(true)
    } else {
      focusIssuesSection()
    }
  }

  function cancelAddToExisting() {
    if (duplicatePrompt?.vinIndex !== undefined && !duplicatePrompt.pendingSubmit) {
      updateVehicleVin(duplicatePrompt.vinIndex, '')
    }
    setDuplicatePrompt(null)
    setExistingVehicleParts(null)
    setExistingViewError('')
  }

  function duplicateMessage(prompt: DuplicatePrompt) {
    if (prompt.vins.length === 1) {
      return t('mp.duplicateVehicleMessage', { vin: prompt.vins[0], model: selectedModelName })
    }
    return t('mp.duplicateVehicleMessageMulti', { vins: prompt.vins.join('، '), model: selectedModelName })
  }

  async function submit(skipDuplicateCheck = false) {
    const missing: string[] = []

    if (!scopeRootId) missing.push(t('mp.errNoOrgUnit'))
    if (!vehicle.modelId) missing.push(t('mp.f.model'))

    const expandedParts = issues.flatMap(line =>
      issuePartDescriptions(line).map(partDescription => ({
        partDescription,
        requiredQty: 1,
        reason: line.reason,
        department: line.department,
        stationId: null as string | null,
        completingDepartment: line.completingDepartment || null,
        followUpEmployeeId: line.followUpEmployeeIds?.[0] || line.followUpEmployeeId || null,
        followUpEmployeeIds: line.followUpEmployeeIds
      }))
    )
    if (expandedParts.length === 0) missing.push(t('mp.errOneIssue'))

    const vinList = vehicle.vins.map(v => normalizeChassisVin(v).toUpperCase()).filter(Boolean)
    if (vinList.length !== vehicle.vehicleCount) missing.push(t('mp.errAllVins'))
    for (let vi = 0; vi < vinList.length; vi++) {
      if (!isValidVinLength(vinList[vi])) missing.push(t('mp.errVinIndex', { n: vi + 1 }))
    }
    const uniqueVins = new Set(vinList)
    if (uniqueVins.size !== vinList.length) missing.push(t('mp.errDuplicateVin'))

    if (missing.length > 0) {
      setFormError(missing.join(' · '))
      return
    }

    if (!skipDuplicateCheck && vehicle.modelId) {
      const unconfirmed = vinList.filter(v => !confirmedExistingVins.has(v))
      if (unconfirmed.length > 0) {
        try {
          const existing = await findExistingVehicleVins(unconfirmed, vehicle.modelId)
          if (existing.length > 0) {
            setDuplicatePrompt({ vins: existing, pendingSubmit: true })
            return
          }
        } catch (err) {
          setFormError(formatError(err))
          return
        }
      }
    }

    setSubmitting(true)
    setFormError('')
    try {
      const normalizedVins = vehicle.vins.map(v => normalizeChassisVin(v).toUpperCase())
      const result = await reportMissingPartsBatch({
        vins: normalizedVins,
        modelId: vehicle.modelId,
        parts: expandedParts,
        colorId: vehicle.colorId,
        reason: expandedParts[0]?.reason ?? issues[0]?.reason,
        department: expandedParts[0]?.department ?? issues[0]?.department,
        notes: vehicle.notes || undefined,
        factoryOrgUnitId: scopeRootId
      })
      onReported?.(t('mp.batchSuccess', { cars: result.vehicle_count, parts: result.missing_part_count }))
      onClose()
    } catch (err) {
      setFormError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const totalRecords = issues.reduce((sum, line) => sum + issuePartDescriptions(line).length, 0) * vehicle.vehicleCount
  const hasConfirmedExisting = confirmedExistingVins.size > 0
  const duplicateVinIdx = duplicateVinIndices(vehicle.vins)

  return {
    t,
    employees,
    scopeRootId,
    scopeLabel,
    reasons,
    departments,
    orgUnits,
    addReason,
    canAssignFollowUp,
    models,
    colors,
    listsLoading,
    issues,
    vehicle,
    vehicleCountDraft,
    formError,
    submitting,
    duplicatePrompt,
    existingVehicleParts,
    existingVehicleLoading,
    existingViewError,
    issuesSectionRef,
    selectedModelName,
    totalRecords,
    hasConfirmedExisting,
    duplicateVinIdx,
    setVehicle,
    setConfirmedExistingVins,
    setExistingVehicleParts,
    patchIssue,
    patchIssueReason,
    updatePartItem,
    addPartItem,
    removePartItem,
    onVehicleCountChange,
    onVehicleCountBlur,
    updateVehicleVin,
    addIssue,
    removeIssue,
    checkVinDuplicate,
    viewExistingVehicle,
    confirmAddToExisting,
    cancelAddToExisting,
    duplicateMessage,
    submit,
    isStockShortageReason
  }
}
