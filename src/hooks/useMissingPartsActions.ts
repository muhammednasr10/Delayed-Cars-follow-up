import { useState, type Dispatch, type SetStateAction } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useFormatError } from './useFormatError'
import type { MissingPartDetail, MissingPartsListTab } from '../Types/missingPart'
import type { MpFollowUpAssignment } from '../Types/mpVehicleActions'
import type { MissingPartWorkflowRequest } from '../Types/missingPartWorkflow'
import {
  assignMissingPartFollowUp,
  attachMissingPartsToReportGroup,
  bulkInstallVehiclesToFull,
  completeVehicleShortage,
  deleteMissingPartRecord,
  updateMissingPartRecord
} from '../services/missingPartsService'
import {
  requestMissingPartTransfer,
  requestVehicleShortageRestore,
  reviewMissingPartWorkflowRequest
} from '../services/missingPartWorkflowService'
import { followUpPartsForRow } from '../Utils/missingPartRowContext'
import { openVehicleShortageLines, remainingInstallLineCount, uniqueVehicleReps } from '../Utils/missingPartPageUtils'
import {
  descriptionsToUnify,
  planMergeSelectedVehicles,
  type MergeIssueOption
} from '../Utils/mergeShortageReportGroup'
import { rememberReportGroupPrimary } from '../Utils/reportGroupPrimary'

export function useMissingPartsActions(opts: {
  items: MissingPartDetail[]
  filtered: MissingPartDetail[]
  listTab: MissingPartsListTab
  load: () => Promise<void> | void
  showSuccess: (msg: string) => void
  setError: Dispatch<SetStateAction<string>>
  selectedVehicleIds: Set<string>
  setSelectedVehicleIds: Dispatch<SetStateAction<Set<string>>>
  canBulkInstall: boolean
  canComplete: boolean
  canDelete: boolean
  canEdit: boolean
  canReviewWorkflow: boolean
  setVehicleCardParts: Dispatch<SetStateAction<MissingPartDetail[] | null>>
}) {
  const {
    items,
    filtered,
    listTab,
    load,
    showSuccess,
    setError,
    selectedVehicleIds,
    setSelectedVehicleIds,
    canBulkInstall,
    canComplete,
    canDelete,
    canEdit,
    canReviewWorkflow,
    setVehicleCardParts
  } = opts
  const { t } = useLang()
  const formatError = useFormatError()

  const [bulkActionBusy, setBulkActionBusy] = useState(false)
  const [completingVehicleId, setCompletingVehicleId] = useState<string | null>(null)
  const [completeTarget, setCompleteTarget] = useState<MissingPartDetail | null>(null)
  const [completeAllTargets, setCompleteAllTargets] = useState<MissingPartDetail[] | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<MissingPartDetail | null>(null)
  const [restoringVehicleId, setRestoringVehicleId] = useState<string | null>(null)
  const [transferringPartId, setTransferringPartId] = useState<string | null>(null)
  const [transferPart, setTransferPart] = useState<MissingPartDetail | null>(null)
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)
  const [mergePicker, setMergePicker] = useState<{ options: MergeIssueOption[]; vehicleCount: number } | null>(
    null
  )

  async function applyFollowUp(row: MissingPartDetail, assignment: MpFollowUpAssignment) {
    const parts = followUpPartsForRow(row, filtered, listTab)
    if (parts.length === 0) return
    setError('')
    try {
      const n = await assignMissingPartFollowUp(
        parts,
        assignment.completingDepartment || null,
        assignment.followUpEmployeeIds?.[0] || assignment.followUpEmployeeId || null,
        { followUpEmployeeIds: assignment.followUpEmployeeIds }
      )
      showSuccess(t('mp.followUp.applied', { n }))
      void load()
    } catch (err) {
      setError(formatError(err))
    }
  }

  async function applyFollowUpSelected(assignment: MpFollowUpAssignment) {
    const parts = filtered.filter(
      p => selectedVehicleIds.has(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled'
    )
    if (parts.length === 0) {
      setError(t('mp.followUp.nothingSelected'))
      return
    }
    setBulkActionBusy(true)
    setError('')
    try {
      const n = await assignMissingPartFollowUp(
        parts,
        assignment.completingDepartment || null,
        assignment.followUpEmployeeIds?.[0] || assignment.followUpEmployeeId || null,
        { preserveCompletingDepartment: !assignment.completingDepartment, followUpEmployeeIds: assignment.followUpEmployeeIds }
      )
      showSuccess(t('mp.followUp.applied', { n }))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBulkActionBusy(false)
    }
  }

  async function bulkInstallSelected() {
    if (!canBulkInstall || selectedVehicleIds.size === 0) return
    const ids = [...selectedVehicleIds]
    const pendingLines = filtered.filter(
      p =>
        ids.includes(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled' && p.installedQty < p.requiredQty
    )
    if (pendingLines.length === 0) {
      setError(t('mp.bulk.nothingToInstall'))
      return
    }
    if (!window.confirm(t('mp.bulk.installConfirm', { vehicles: ids.length, lines: pendingLines.length }))) return
    setBulkActionBusy(true)
    setError('')
    try {
      const result = await bulkInstallVehiclesToFull(ids, filtered)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.bulk.installSuccess', { vehicles: result.vehicles, lines: result.lines }))
      await load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBulkActionBusy(false)
    }
  }

  function requestCompleteAll(parts: MissingPartDetail[]) {
    setCompleteTarget(null)
    setCompleteAllTargets(uniqueVehicleReps(parts))
  }

  function requestCompletePicked(parts: MissingPartDetail[]) {
    const reps = uniqueVehicleReps(parts).filter(p =>
      items.some(line => line.vehicleId === p.vehicleId && !line.shortageResolvedAt)
    )
    if (reps.length === 0) {
      setError(t('mp.bulk.nothingToComplete'))
      return
    }
    if (reps.length === 1) requestCompleteVehicle(reps[0])
    else requestCompleteAll(reps)
  }

  function bulkCompleteSelected() {
    const ids = [...selectedVehicleIds]
    const reps = uniqueVehicleReps(
      filtered.filter(p => ids.includes(p.vehicleId) && !p.shortageResolvedAt)
    )
    if (reps.length === 0) {
      setError(t('mp.bulk.nothingToComplete'))
      return
    }
    requestCompleteAll(reps)
  }

  async function bulkDeleteSelected() {
    if (!canDelete || selectedVehicleIds.size === 0) return
    const ids = [...selectedVehicleIds]
    const targets = filtered.filter(p => {
      if (!ids.includes(p.vehicleId)) return false
      if (listTab === 'history') return !!p.shortageResolvedAt
      return p.status !== 'closed' && p.status !== 'cancelled' && !p.shortageResolvedAt
    })
    if (targets.length === 0) {
      setError(t('mp.bulk.nothingToDelete'))
      return
    }
    if (
      !window.confirm(
        t(listTab === 'history' ? 'mp.bulk.deleteConfirmArchive' : 'mp.bulk.deleteConfirm', {
          vehicles: ids.length,
          lines: targets.length
        })
      )
    )
      return
    setBulkActionBusy(true)
    setError('')
    try {
      for (const row of targets) await deleteMissingPartRecord(row.id)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.bulk.deleteSuccess', { vehicles: ids.length, lines: targets.length }))
      await load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBulkActionBusy(false)
    }
  }

  async function executeMerge(primaryIssueKey?: string | null) {
    if (!canEdit || listTab !== 'active' || selectedVehicleIds.size < 2) return
    const plan = planMergeSelectedVehicles(selectedVehicleIds, filtered, primaryIssueKey)
    if (!plan.ok) {
      if (plan.error === 'needPrimaryReason' && plan.options?.length) {
        setError('')
        setMergePicker({ options: plan.options, vehicleCount: selectedVehicleIds.size })
        return
      }
      setError(t(`mp.bulk.merge.${plan.error}`))
      return
    }
    if (
      !window.confirm(
        t('mp.bulk.merge.confirm', {
          vehicles: plan.vehicleCount,
          lines: plan.lineCount,
          issue: plan.issueLabel,
          branches: plan.branchLineCount
        })
      )
    )
      return
    setBulkActionBusy(true)
    setError('')
    setMergePicker(null)
    try {
      await attachMissingPartsToReportGroup(plan.attachIds, plan.reportGroupId)
      rememberReportGroupPrimary(plan.reportGroupId, plan.primaryIssueKey)
      const unify = descriptionsToUnify(
        filtered.filter(part => plan.attachIds.includes(part.id)),
        plan.primaryIssueKey,
        plan.issueLabel
      )
      for (const part of unify) {
        await updateMissingPartRecord(
          part.id,
          {
            partDescription: plan.issueLabel,
            requiredQty: part.requiredQty,
            reason: part.reason,
            department: part.department,
            priority: part.priority,
            stopperType: part.stopperType,
            notes: part.notes ?? undefined,
            completingDepartment: part.completingDepartment,
            followUpEmployeeId: part.followUpEmployeeIds?.[0] || part.followUpEmployeeId,
            followUpEmployeeIds: part.followUpEmployeeIds,
            assignFollowUp: false
          },
          { skipActivityNote: true }
        )
      }
      setSelectedVehicleIds(new Set())
      showSuccess(
        t('mp.bulk.merge.success', {
          vehicles: plan.vehicleCount,
          issue: plan.issueLabel,
          branches: plan.branchLineCount
        })
      )
      await load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBulkActionBusy(false)
    }
  }

  async function bulkMergeSelected() {
    await executeMerge(null)
  }

  function confirmMergeWithPrimary(primaryIssueKey: string) {
    void executeMerge(primaryIssueKey)
  }

  function onReported(msg?: string) {
    showSuccess(msg ?? t('mp.success'))
    void load()
  }

  async function removeParts(targets: MissingPartDetail[]) {
    if (targets.length === 0) return
    const label =
      targets.length > 1
        ? t('mp.deleteGroupConfirm', { n: targets.length, part: targets[0].partDescription })
        : t('mp.deleteConfirm', { part: targets[0].partDescription })
    if (!window.confirm(label)) return
    setError('')
    try {
      for (const row of targets) await deleteMissingPartRecord(row.id)
      showSuccess(t('common.deleted'))
      void load()
    } catch (err) {
      setError(formatError(err))
    }
  }

  function requestCompleteVehicle(row: MissingPartDetail) {
    setCompleteAllTargets(null)
    setCompleteTarget(row)
  }

  function openTransferRequest(part: MissingPartDetail) {
    if (!canComplete || part.pendingTransferRequestId) return
    setTransferPart(part)
  }

  async function submitTransferRequest(part: MissingPartDetail, stationId: string) {
    if (!canComplete || transferringPartId) return
    setTransferringPartId(part.id)
    setError('')
    try {
      await requestMissingPartTransfer(part.id, stationId)
      setTransferPart(null)
      showSuccess(t('mp.workflow.transferRequested'))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setTransferringPartId(null)
    }
  }

  async function confirmCompleteVehicle() {
    if (!completeTarget) return
    setCompletingVehicleId(completeTarget.vehicleId)
    setError('')
    try {
      await completeVehicleShortage(completeTarget.vehicleId)
      setCompleteTarget(null)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.completeSuccess', { vin: completeTarget.vin }))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setCompletingVehicleId(null)
    }
  }

  async function confirmCompleteAll() {
    if (!completeAllTargets?.length) return
    setCompletingVehicleId(completeAllTargets[0].vehicleId)
    setError('')
    const targets = [...completeAllTargets]
    try {
      let archived = 0
      for (const rep of targets) {
        if (!openVehicleShortageLines(rep.vehicleId, items).length) continue
        await completeVehicleShortage(rep.vehicleId)
        archived += 1
      }
      setCompleteAllTargets(null)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.completeAllSuccess', { n: archived || targets.length }))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setCompletingVehicleId(null)
    }
  }

  async function confirmRestoreVehicle() {
    if (!restoreTarget) return
    setRestoringVehicleId(restoreTarget.vehicleId)
    setError('')
    try {
      await requestVehicleShortageRestore(restoreTarget.vehicleId)
      setRestoreTarget(null)
      setVehicleCardParts(null)
      showSuccess(t('mp.workflow.restoreRequested', { vin: restoreTarget.vin }))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setRestoringVehicleId(null)
    }
  }

  async function reviewRequest(request: MissingPartWorkflowRequest, approve: boolean) {
    if (!canReviewWorkflow || reviewingRequestId) return
    setReviewingRequestId(request.id)
    setError('')
    try {
      await reviewMissingPartWorkflowRequest(request.id, approve)
      showSuccess(approve ? t('mp.workflow.approved') : t('mp.workflow.rejected'))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setReviewingRequestId(null)
    }
  }

  const completeRemaining = completeTarget
    ? remainingInstallLineCount(openVehicleShortageLines(completeTarget.vehicleId, items))
    : 0

  return {
    bulkActionBusy,
    completingVehicleId,
    completeTarget,
    completeAllTargets,
    completeRemaining,
    restoreTarget,
    restoringVehicleId,
    transferringPartId,
    transferPart,
    reviewingRequestId,
    applyFollowUp,
    applyFollowUpSelected,
    bulkInstallSelected,
    bulkCompleteSelected,
    bulkDeleteSelected,
    bulkMergeSelected,
    mergePicker,
    confirmMergeWithPrimary,
    setMergePicker,
    onReported,
    removeParts,
    requestCompleteVehicle,
    requestCompleteAll,
    requestCompletePicked,
    openTransferRequest,
    submitTransferRequest,
    confirmCompleteVehicle,
    confirmCompleteAll,
    confirmRestoreVehicle,
    reviewRequest,
    setCompleteTarget,
    setCompleteAllTargets,
    setRestoreTarget,
    setTransferPart
  }
}
