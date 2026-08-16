import { useEffect, useMemo, useState, useCallback } from 'react'
import { CheckCircle2, PackageCheck, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useMpLookups } from '../../hooks/useMpLookups'
import { useMissingPartsUiPermissions } from '../../hooks/useMissingPartsUiPermissions'
import { useFormatError } from '../../hooks/useFormatError'
import { SetupRequired } from '../../Components/SetupRequired'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { UpdateMissingPartModal, type UpdateVehicleContext } from '../../Components/UpdateMissingPartModal'
import { EditMissingPartModal } from '../../Components/EditMissingPartModal'
import { EditReportGroupModal } from '../../Components/EditReportGroupModal'
import { VinListModal } from '../../Components/VinListModal'
import { MissingPartIssuesModal } from '../../Components/MissingPartIssuesModal'
import type { ReportGroupContext, VehicleIssuesContext } from '../../Types/missingPart'
import {
  buildMissingPartTableRows,
  isReportGroup,
  partsFromTableRow,
  reportGroupMembers,
  vehicleIdsFromTableRow,
  type MissingPartTableRow
} from '../../Utils/missingPartDisplay'
import { MissingPartDetailModal } from '../../Components/MissingPartDetailModal'
import { VehicleCardModal } from '../../Components/missingParts/VehicleCardModal'
import { VehicleNotesModal } from '../../Components/VehicleNotesModal'
import type { VehicleNoteTarget } from '../../Types/vehicleNote'
import {
  bulkInstallVehiclesToFull,
  completeVehicleShortage,
  deleteMissingPartRecord,
  getMissingParts
} from '../../services/missingPartsService'
import {
  listMissingPartWorkflowRequests,
  requestMissingPartTransfer,
  requestVehicleShortageRestore,
  reviewMissingPartWorkflowRequest
} from '../../services/missingPartWorkflowService'
import type { MissingPartWorkflowRequest } from '../../Types/missingPartWorkflow'
import type { MissingPartDetail, MissingPartFilters } from '../../Types/missingPart'
import { MissingPartsToolbar, type ListTab } from '../../Components/missingParts/MissingPartsToolbar'
import { MissingPartsTable } from '../../Components/missingParts/MissingPartsTable'
import { MissingPartsApprovalsTab } from '../../Components/missingParts/MissingPartsApprovalsTab'
import { TransferToQualityModal } from '../../Components/missingParts/TransferToQualityModal'
import { MissingPartsDailyJournalTab } from '../../Components/missingParts/MissingPartsDailyJournalTab'
import { MissingPartsFamilyCardsTab } from '../../Components/missingParts/MissingPartsFamilyCardsTab'
import {
  applyFilters,
  isSchemaMissing,
  openVehicleShortageLines,
  remainingInstallLineCount,
  uniqueVehicleReps
} from '../../Utils/missingPartPageUtils'
import { scratchAreaLabel } from '../../Utils/scratchAreaOptions'
import { ConfirmDialog } from '../../Components/ConfirmDialog'

export function MissingPartsPage() {
  const { t } = useLang()
  const { reasons, departments } = useMpLookups()
  const {
    role,
    visibleTabs,
    canReport,
    canFilter,
    canExport,
    canUpdateStatus,
    canNotes,
    canEdit,
    canDelete,
    canComplete,
    canReviewWorkflow,
    canBulkInstallAndUpdate
  } = useMissingPartsUiPermissions()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { filterRecords, isScopedView, scopeLabel, orgUnits } = useFactoryOrgScope(employees)
  const orgUnitLabelFor = useCallback(
    (id: string | null | undefined) => (id ? scratchAreaLabel(id, orgUnits) : '—'),
    [orgUnits]
  )
  const canBulkInstall = canBulkInstallAndUpdate
  const canBulkSelectActive = canBulkInstall || canComplete || canDelete
  const canBulkSelectArchive = canDelete
  const [items, setItems] = useState<MissingPartDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [listTab, setListTab] = useState<ListTab>('active')
  const [filters, setFilters] = useState<MissingPartFilters>({
    search: '',
    modelNames: [],
    departments: [],
    resolvedMonth: null,
    dateFrom: '',
    dateTo: ''
  })
  const [showReport, setShowReport] = useState(false)
  const [updateVehicle, setUpdateVehicle] = useState<UpdateVehicleContext | null>(null)
  const [editVehicle, setEditVehicle] = useState<VehicleIssuesContext | null>(null)
  const [editGroup, setEditGroup] = useState<ReportGroupContext | null>(null)
  const [vinList, setVinList] = useState<{ vins: string[]; modelName: string; colorName: string | null } | null>(null)
  const [issuesList, setIssuesList] = useState<{ parts: MissingPartDetail[]; vin?: string; modelName?: string } | null>(
    null
  )
  const [detailTarget, setDetailTarget] = useState<MissingPartDetail | null>(null)
  const [vehicleCardParts, setVehicleCardParts] = useState<MissingPartDetail[] | null>(null)
  const [notesTarget, setNotesTarget] = useState<VehicleNoteTarget | null>(null)
  const [success, setSuccess] = useState('')
  const [completingVehicleId, setCompletingVehicleId] = useState<string | null>(null)
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set())
  const [bulkActionBusy, setBulkActionBusy] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<MissingPartDetail | null>(null)
  const [completeAllTargets, setCompleteAllTargets] = useState<MissingPartDetail[] | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<MissingPartDetail | null>(null)
  const [restoringVehicleId, setRestoringVehicleId] = useState<string | null>(null)
  const [transferringPartId, setTransferringPartId] = useState<string | null>(null)
  const [transferPart, setTransferPart] = useState<MissingPartDetail | null>(null)
  const [workflowRequests, setWorkflowRequests] = useState<MissingPartWorkflowRequest[]>([])
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)

  const canBulkSelectForTab = useMemo(() => {
    if (listTab === 'history') return canBulkSelectArchive
    if (listTab === 'active') return canBulkSelectActive
    return false
  }, [listTab, canBulkSelectArchive, canBulkSelectActive])

  useEffect(() => {
    if (!visibleTabs.includes(listTab)) {
      setListTab(visibleTabs[0] ?? 'active')
    }
  }, [listTab, visibleTabs])

  function editableMembers(row: MissingPartDetail) {
    const members = reportGroupMembers(row, filtered)
    return listTab === 'history' ? members : members.filter(p => p.status !== 'closed' && p.status !== 'cancelled')
  }

  function vehicleContext(row: MissingPartDetail): VehicleIssuesContext {
    const parts = filtered.filter(
      p =>
        p.vehicleId === row.vehicleId && (listTab === 'history' || (p.status !== 'closed' && p.status !== 'cancelled'))
    )
    return {
      vehicleId: row.vehicleId,
      vin: row.vin,
      modelName: row.modelName,
      colorName: row.colorName,
      colorHex: row.colorHex,
      parts,
      allowArchived: listTab === 'history'
    }
  }

  function openUpdate(row: MissingPartDetail) {
    const members = reportGroupMembers(row, filtered).filter(p => p.status !== 'closed' && p.status !== 'cancelled')
    if (members.length === 0) return
    setUpdateVehicle({
      vehicleId: row.vehicleId,
      vin: row.vin,
      modelName: row.modelName,
      colorName: row.colorName,
      colorHex: row.colorHex,
      parts: isReportGroup(row, filtered) ? members : vehicleContext(row).parts
    })
  }

  function openEdit(row: MissingPartDetail) {
    const members = editableMembers(row)
    if (members.length === 0) return
    if (isReportGroup(row, filtered) && row.reportGroupId) {
      setEditGroup({
        reportGroupId: row.reportGroupId,
        modelName: row.modelName,
        colorName: row.colorName,
        colorHex: row.colorHex,
        stationId: row.stationId,
        parts: members,
        allowArchived: listTab === 'history'
      })
      setEditVehicle(null)
    } else {
      setEditVehicle(vehicleContext(row))
      setEditGroup(null)
    }
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      setItems(await getMissingParts())
      setSetupRequired(false)
      try {
        setWorkflowRequests(await listMissingPartWorkflowRequests('pending'))
      } catch {
        setWorkflowRequests([])
      }
    } catch (err) {
      const message = formatError(err)
      setSetupRequired(isSchemaMissing(message))
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setSelectedVehicleIds(new Set())
  }, [listTab, filters])

  const modelOptions = useMemo(() => Array.from(new Set(items.map(i => i.modelName).filter(Boolean))).sort(), [items])
  const departmentFilterCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const d of departments) codes.add(d.code)
    for (const i of items) if (i.department) codes.add(i.department)
    return Array.from(codes).sort()
  }, [departments, items])

  const scopedItems = useMemo(() => filterRecords(items), [items, filterRecords])
  const activeItems = useMemo(() => scopedItems.filter(i => !i.shortageResolvedAt), [scopedItems])
  const historyItems = useMemo(() => scopedItems.filter(i => !!i.shortageResolvedAt), [scopedItems])
  const activeVehicleCount = useMemo(() => new Set(activeItems.map(i => i.vehicleId)).size, [activeItems])
  const historyVehicleCount = useMemo(() => new Set(historyItems.map(i => i.vehicleId)).size, [historyItems])
  const tabSource = useMemo(() => {
    if (listTab === 'history' || listTab === 'historySummary') return historyItems
    return activeItems
  }, [listTab, historyItems, activeItems])
  const filtered = useMemo(() => applyFilters(tabSource, filters), [tabSource, filters])
  const tableRows = useMemo(
    () => buildMissingPartTableRows(filtered, listTab === 'history' ? 'resolved-desc' : 'created-asc'),
    [filtered, listTab]
  )
  const tabVehicleCount = useMemo(() => new Set(tabSource.map(i => i.vehicleId)).size, [tabSource])
  const filteredVehicleCount = useMemo(() => new Set(filtered.map(i => i.vehicleId)).size, [filtered])
  const hasActiveFilter = Boolean(
    filters.search.trim() ||
      filters.modelNames.length > 0 ||
      filters.departments.length > 0 ||
      filters.resolvedMonth
  )

  function changeListTab(tab: ListTab) {
    const leavingArchive =
      (listTab === 'history' || listTab === 'historySummary') && tab !== 'history' && tab !== 'historySummary'
    if (leavingArchive) setFilters(p => (p.resolvedMonth ? { ...p, resolvedMonth: null } : p))
    setListTab(tab)
  }

  // Keep the vehicle card in sync after actions like "ترحيل".
  useEffect(() => {
    if (!vehicleCardParts?.length) return
    const vid = vehicleCardParts[0].vehicleId
    const next = items.filter(p => p.vehicleId === vid)
    setVehicleCardParts(next.length ? next : null)
  }, [items])

  // Keep update-install modal parts in sync after per-issue transfer.
  useEffect(() => {
    if (!updateVehicle) return
    const vehicleIds = new Set(updateVehicle.parts.map(p => p.vehicleId))
    const nextParts = items.filter(
      p =>
        vehicleIds.has(p.vehicleId) &&
        p.status !== 'closed' &&
        p.status !== 'cancelled' &&
        !p.shortageResolvedAt
    )
    if (nextParts.length === 0) {
      setUpdateVehicle(null)
      return
    }
    const prevIds = updateVehicle.parts.map(p => p.id).join(',')
    const nextIds = nextParts.map(p => p.id).join(',')
    if (prevIds === nextIds) return
    setUpdateVehicle(prev => (prev ? { ...prev, parts: nextParts } : null))
  }, [items, updateVehicle])

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

  function bulkCompleteSelected() {
    const ids = [...selectedVehicleIds]
    const reps = uniqueVehicleReps(
      filtered.filter(
        p => ids.includes(p.vehicleId) && !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled'
      )
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

  function showSuccess(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 3500)
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

  function requestCompleteAll(parts: MissingPartDetail[]) {
    setCompleteTarget(null)
    setCompleteAllTargets(uniqueVehicleReps(parts))
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

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <section className="space-y-5">
      <div className="card-industrial overflow-hidden">
        <MissingPartsToolbar
          listTab={listTab}
          visibleTabs={visibleTabs}
          canUseFilters={canFilter}
          onListTabChange={changeListTab}
          activeCount={activeVehicleCount}
          historyCount={historyVehicleCount}
          approvalsCount={workflowRequests.length}
          searchPool={tabSource}
          filters={filters}
          onFiltersChange={patch => setFilters(p => ({ ...p, ...patch }))}
          modelOptions={modelOptions}
          departmentFilterCodes={departmentFilterCodes}
          departments={departments}
          canReport={canReport}
          role={role}
          onReport={() => setShowReport(true)}
          summaryItems={listTab === 'active' ? filtered : null}
        />

        {success && (
          <div className="m-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {success}
          </div>
        )}
        {error && !setupRequired && (
          <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {isScopedView && scopeLabel && (
          <div className="mx-4 mb-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {t('org.scopeBanner', { scope: scopeLabel })}
          </div>
        )}

        {(listTab === 'active' || listTab === 'history') && canBulkSelectForTab && selectedVehicleIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
            <span className="text-sm font-bold text-slate-300">
              {t('mp.bulk.selected', { n: selectedVehicleIds.size })}
            </span>
            {listTab === 'active' && canBulkInstall && (
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={() => void bulkInstallSelected()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <PackageCheck className="h-4 w-4" />
                {t('mp.bulk.installSelected')}
              </button>
            )}
            {listTab === 'active' && canComplete && (
              <button
                type="button"
                disabled={bulkActionBusy || Boolean(completingVehicleId)}
                onClick={bulkCompleteSelected}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t('mp.bulk.completeSelected')}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={bulkActionBusy}
                onClick={() => void bulkDeleteSelected()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t('mp.bulk.deleteSelected')}
              </button>
            )}
            <button
              type="button"
              disabled={bulkActionBusy}
              onClick={() => setSelectedVehicleIds(new Set())}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              {t('mp.bulk.clearSelection')}
            </button>
          </div>
        )}

        {listTab === 'byFamily' ? (
          <MissingPartsFamilyCardsTab
            items={filtered}
            reasons={reasons}
            departments={departments}
            loading={loading}
            canUpdateStatus={canUpdateStatus}
            canNotes={canNotes}
            canEdit={canEdit}
            canDelete={canDelete}
            canComplete={canComplete}
            completingVehicleId={completingVehicleId}
            onOpenNotes={row =>
              setNotesTarget({
                vehicleId: row.vehicleId,
                vin: row.vin,
                modelName: row.modelName,
                colorName: row.colorName,
                colorHex: row.colorHex
              })
            }
            onOpenDetail={setDetailTarget}
            onEdit={openEdit}
            onUpdate={openUpdate}
            onDeleteParts={parts => void removeParts(parts)}
            onComplete={requestCompleteVehicle}
          />
        ) : listTab === 'approvals' ? (
          <MissingPartsApprovalsTab
            requests={workflowRequests}
            loading={loading}
            reviewingId={reviewingRequestId}
            canReview={canReviewWorkflow}
            onApprove={req => void reviewRequest(req, true)}
            onReject={req => void reviewRequest(req, false)}
          />
        ) : listTab === 'historyDiary' ? (
          <MissingPartsDailyJournalTab items={scopedItems} loading={loading} canExport={canExport} />
        ) : listTab === 'summary' || listTab === 'historySummary' ? (
          <MissingPartsSummaryTab
            items={filtered}
            reasons={reasons}
            departments={departments}
            hasActiveFilter={hasActiveFilter}
            filteredVehicleCount={filteredVehicleCount}
            tabVehicleCount={tabVehicleCount}
            variant={listTab === 'historySummary' ? 'archive' : 'active'}
          />
        ) : (
          <MissingPartsTable
            listTab={listTab === 'history' ? 'history' : 'active'}
            filtered={filtered}
            loading={loading}
            reasons={reasons}
            departments={departments}
            canBulkSelect={canBulkSelectForTab}
            canBulkInstall={canBulkInstall}
            canExport={canExport}
            canEdit={canEdit}
            canDelete={canDelete}
            canUpdateStatus={canUpdateStatus}
            canNotes={canNotes}
            canComplete={canComplete}
            selectableVehicleIds={selectableVehicleIds}
            selectedVehicleIds={selectedVehicleIds}
            bulkInstalling={bulkActionBusy}
            completingVehicleId={completingVehicleId}
            allSelectableSelected={allSelectableSelected}
            someSelectableSelected={someSelectableSelected}
            onToggleSelectAll={toggleSelectAllVisible}
            onToggleRowSelection={toggleRowSelection}
            onOpenVinList={(vins, modelName, colorName) => setVinList({ vins, modelName, colorName })}
            onOpenIssuesList={(parts, vin, modelName) => setIssuesList({ parts, vin, modelName })}
            onOpenDetail={setDetailTarget}
            onRowClick={setVehicleCardParts}
            onOpenNotes={row =>
              setNotesTarget({
                vehicleId: row.vehicleId,
                vin: row.vin,
                modelName: row.modelName,
                colorName: row.colorName,
                colorHex: row.colorHex
              })
            }
            onEdit={openEdit}
            onUpdate={openUpdate}
            onDeleteParts={parts => void removeParts(parts)}
            onComplete={requestCompleteVehicle}
            onCompleteAll={requestCompleteAll}
          />
        )}
      </div>

      <ReportMissingPartModal open={showReport} onClose={() => setShowReport(false)} onReported={onReported} />
      <UpdateMissingPartModal
        vehicle={updateVehicle}
        onClose={() => setUpdateVehicle(null)}
        onChanged={load}
        onNotify={showSuccess}
        onRequestTransfer={openTransferRequest}
      />
      <EditMissingPartModal
        vehicle={editVehicle}
        activeListParts={activeItems}
        onClose={() => setEditVehicle(null)}
        onSaved={load}
      />
      <EditReportGroupModal
        group={editGroup}
        activeListParts={activeItems}
        onClose={() => setEditGroup(null)}
        onSaved={load}
      />
      <VinListModal
        vins={vinList?.vins ?? null}
        modelName={vinList?.modelName}
        colorName={vinList?.colorName}
        onClose={() => setVinList(null)}
      />
      <MissingPartIssuesModal
        parts={issuesList?.parts ?? null}
        vin={issuesList?.vin}
        modelName={issuesList?.modelName}
        reasons={reasons}
        departments={departments}
        onClose={() => setIssuesList(null)}
      />
      <MissingPartDetailModal part={detailTarget} onClose={() => setDetailTarget(null)} />
      <VehicleCardModal
        parts={vehicleCardParts}
        orgUnitLabel={vehicleCardParts?.[0] ? orgUnitLabelFor(vehicleCardParts[0].factoryOrgUnitId) : undefined}
        completingVehicleId={completingVehicleId}
        transferringPartId={transferringPartId}
        restoringVehicleId={restoringVehicleId}
        canTransferIssue={canComplete}
        canRestoreFromArchive={canComplete}
        onTransferIssue={openTransferRequest}
        onRestoreFromArchive={part => setRestoreTarget(part)}
        onClose={() => setVehicleCardParts(null)}
      />
      <VehicleNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />

      <ConfirmDialog
        open={Boolean(completeTarget || completeAllTargets)}
        title={
          completeAllTargets
            ? t('mp.completeAllConfirm')
            : completeRemaining > 0
              ? t('mp.completePartialTitle')
              : t('mp.complete')
        }
        message={
          completeAllTargets
            ? t('mp.completeAllMessage', { n: completeAllTargets.length })
            : completeTarget
              ? completeRemaining > 0
                ? t('mp.completePartialMessage', { vin: completeTarget.vin, n: completeRemaining })
                : t('mp.completeConfirm', { vin: completeTarget.vin })
              : ''
        }
        confirmLabel={
          completeAllTargets
            ? t('mp.completeAllYes')
            : completeRemaining > 0
              ? t('mp.completePartialYes')
              : t('common.confirm')
        }
        cancelLabel={
          completeAllTargets
            ? t('mp.completePartialNo')
            : completeRemaining > 0
              ? t('mp.completePartialNo')
              : t('common.cancel')
        }
        tone="default"
        busy={Boolean(completingVehicleId)}
        onConfirm={() => void (completeAllTargets ? confirmCompleteAll() : confirmCompleteVehicle())}
        onCancel={() => {
          setCompleteTarget(null)
          setCompleteAllTargets(null)
        }}
      />
      <TransferToQualityModal
        part={transferPart}
        busy={Boolean(transferringPartId)}
        onConfirm={(part, stationId) => void submitTransferRequest(part, stationId)}
        onClose={() => setTransferPart(null)}
      />
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title={t('mp.workflow.restoreConfirmTitle')}
        message={restoreTarget ? t('mp.workflow.restoreConfirm', { vin: restoreTarget.vin }) : ''}
        confirmLabel={t('mp.workflow.submitRestore')}
        cancelLabel={t('common.cancel')}
        tone="default"
        busy={Boolean(restoringVehicleId)}
        onConfirm={() => void confirmRestoreVehicle()}
        onCancel={() => setRestoreTarget(null)}
      />
    </section>
  )
}
