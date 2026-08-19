import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { useMpLookups } from '../../hooks/useMpLookups'
import { useMissingPartsUiPermissions } from '../../hooks/useMissingPartsUiPermissions'
import { useMissingPartsData } from '../../hooks/useMissingPartsData'
import { useMissingPartsActions } from '../../hooks/useMissingPartsActions'
import { useMissingPartsSelection } from '../../hooks/useMissingPartsSelection'
import { SetupRequired } from '../../Components/SetupRequired'
import type { ReportGroupContext, VehicleIssuesContext } from '../../Types/missingPart'
import type { UpdateVehicleContext } from '../../Components/UpdateMissingPartModal'
import { uniqueVehicleReps } from '../../Utils/missingPartPageUtils'
import { isReportGroup } from '../../Utils/missingPartDisplay'
import { editableMembers, notesTargetFromPart, vehicleIssuesContext } from '../../Utils/missingPartRowContext'
import { MissingPartsToolbar } from '../../Components/missingParts/MissingPartsToolbar'
import { MissingPartsTable } from '../../Components/missingParts/MissingPartsTable'
import { MissingPartsApprovalsTab } from '../../Components/missingParts/MissingPartsApprovalsTab'
import { MissingPartsDailyJournalTab } from '../../Components/missingParts/MissingPartsDailyJournalTab'
import { MissingPartsFamilyCardsTab } from '../../Components/missingParts/MissingPartsFamilyCardsTab'
import { MissingPartsSummaryTab } from '../../Components/missingParts/MissingPartsSummaryTab'
import { MissingPartsBulkBar } from '../../Components/missingParts/MissingPartsBulkBar'
import { MissingPartsPageDialogs } from '../../Components/missingParts/MissingPartsPageDialogs'
import { scratchAreaLabel } from '../../Utils/scratchAreaOptions'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { VehicleNoteTarget } from '../../Types/vehicleNote'
import type { VinListModalPayload } from '../../Components/VinListModal'

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
    canAssignFollowUp,
    canReviewWorkflow,
    canBulkInstallAndUpdate
  } = useMissingPartsUiPermissions()
  const { employees } = useEmployees()
  const { isScopedView, scopeLabel, orgUnits, employeeId: myEmployeeId } = useFactoryOrgScope(employees)
  const orgUnitLabelFor = useCallback(
    (id: string | null | undefined) => (id ? scratchAreaLabel(id, orgUnits) : '—'),
    [orgUnits]
  )
  const canBulkInstall = canBulkInstallAndUpdate
  const canBulkSelectActive = canBulkInstall || canComplete || canDelete || canAssignFollowUp
  const canBulkSelectArchive = canDelete
  const data = useMissingPartsData()
  const {
    items,
    loading,
    error,
    setupRequired,
    success,
    showSuccess,
    load,
    listTab,
    changeListTab,
    setListTab,
    filters,
    setFilters,
    scopedItems,
    activeItems,
    tabSource,
    filtered,
    tableRows,
    modelOptions,
    activeVehicleCount,
    historyVehicleCount,
    tabVehicleCount,
    filteredVehicleCount,
    hasActiveFilter,
    noteCounts,
    loadNoteCounts,
    shortageMissions,
    assignShortageMission,
    assignMissionBusy,
    workflowRequests,
    selectedVehicleIds,
    setSelectedVehicleIds
  } = data

  const [showReport, setShowReport] = useState(false)
  const [updateVehicle, setUpdateVehicle] = useState<UpdateVehicleContext | null>(null)
  const [editVehicle, setEditVehicle] = useState<VehicleIssuesContext | null>(null)
  const [editGroup, setEditGroup] = useState<ReportGroupContext | null>(null)
  const [vinList, setVinList] = useState<VinListModalPayload | null>(null)
  const [detailTarget, setDetailTarget] = useState<MissingPartDetail | null>(null)
  const [vehicleCardParts, setVehicleCardParts] = useState<MissingPartDetail[] | null>(null)
  const [notesTarget, setNotesTarget] = useState<VehicleNoteTarget | null>(null)

  const canBulkSelectForTab = useMemo(() => {
    if (listTab === 'history') return canBulkSelectArchive
    if (listTab === 'active') return canBulkSelectActive
    return false
  }, [listTab, canBulkSelectArchive, canBulkSelectActive])

  const actions = useMissingPartsActions({
    items,
    filtered,
    listTab,
    load,
    showSuccess,
    setError: data.setError,
    selectedVehicleIds,
    setSelectedVehicleIds,
    canBulkInstall,
    canComplete,
    canDelete,
    canReviewWorkflow,
    setVehicleCardParts
  })
  const selection = useMissingPartsSelection({
    tableRows,
    listTab,
    canBulkSelectForTab,
    selectedVehicleIds,
    setSelectedVehicleIds
  })

  useEffect(() => {
    if (!visibleTabs.includes(listTab)) {
      setListTab(visibleTabs[0] ?? 'active')
    }
  }, [listTab, visibleTabs, setListTab])

  function openUpdate(row: MissingPartDetail) {
    const members = editableMembers(row, filtered, 'active').filter(
      p => p.status !== 'closed' && p.status !== 'cancelled'
    )
    if (members.length === 0) return
    setUpdateVehicle({
      vehicleId: row.vehicleId,
      vin: row.vin,
      modelName: row.modelName,
      colorName: row.colorName,
      colorHex: row.colorHex,
      parts: isReportGroup(row, filtered) ? members : vehicleIssuesContext(row, filtered, listTab).parts
    })
  }

  function openEdit(row: MissingPartDetail) {
    const members = editableMembers(row, filtered, listTab)
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
      setEditVehicle(vehicleIssuesContext(row, filtered, listTab))
      setEditGroup(null)
    }
  }

  useEffect(() => {
    if (!vehicleCardParts?.length) return
    const vid = vehicleCardParts[0].vehicleId
    const next = items.filter(p => p.vehicleId === vid)
    setVehicleCardParts(next.length ? next : null)
  }, [items])

  useEffect(() => {
    if (!updateVehicle) return
    const vehicleIds = new Set(updateVehicle.parts.map(p => p.vehicleId))
    const nextParts = items.filter(
      p => vehicleIds.has(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled' && !p.shortageResolvedAt
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

  if (setupRequired) return <SetupRequired detail={error} />

  const rowActions = {
    onOpenNotes: (row: MissingPartDetail) => setNotesTarget(notesTargetFromPart(row)),
    onEdit: openEdit,
    onUpdate: openUpdate,
    onDeleteParts: (parts: MissingPartDetail[]) => void actions.removeParts(parts),
    onComplete: actions.requestCompleteVehicle,
    onCompleteAll: (parts: MissingPartDetail[]) => {
      const reps = uniqueVehicleReps(parts)
      if (reps.length <= 1) {
        actions.requestCompleteAll(parts)
        return
      }
      const first = reps[0]
      setVinList({
        parts: reps,
        modelName: first.modelName,
        colorName: first.colorName,
        pickComplete: true
      })
    },
    onAssignFollowUp: (
      row: MissingPartDetail,
      assignment: { completingDepartment: string; followUpEmployeeId: string }
    ) => void actions.applyFollowUp(row, assignment),
    onAssignShortageMission: assignShortageMission,
    assignMissionBusy,
    shortageMissions
  }

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
          hasActiveFilter={hasActiveFilter}
          filteredVehicleCount={filteredVehicleCount}
          tabVehicleCount={tabVehicleCount}
          searchPool={tabSource}
          filters={filters}
          onFiltersChange={patch => setFilters(p => ({ ...p, ...patch }))}
          modelOptions={modelOptions}
          orgUnits={orgUnits}
          employees={employees}
          myEmployeeId={myEmployeeId}
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
          <MissingPartsBulkBar
            selectedCount={selectedVehicleIds.size}
            listTab={listTab}
            canBulkInstall={canBulkInstall}
            canComplete={canComplete}
            canAssignFollowUp={canAssignFollowUp}
            canDelete={canDelete}
            bulkActionBusy={actions.bulkActionBusy}
            completingVehicleId={actions.completingVehicleId}
            employees={employees}
            onInstall={() => void actions.bulkInstallSelected()}
            onComplete={actions.bulkCompleteSelected}
            onFollowUp={next => void actions.applyFollowUpSelected(next)}
            onDelete={() => void actions.bulkDeleteSelected()}
            onClear={() => setSelectedVehicleIds(new Set())}
          />
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
            noteCounts={noteCounts}
            completingVehicleId={actions.completingVehicleId}
            onOpenDetail={setDetailTarget}
            {...rowActions}
          />
        ) : listTab === 'approvals' ? (
          <MissingPartsApprovalsTab
            requests={workflowRequests}
            loading={loading}
            reviewingId={actions.reviewingRequestId}
            canReview={canReviewWorkflow}
            onApprove={req => void actions.reviewRequest(req, true)}
            onReject={req => void actions.reviewRequest(req, false)}
          />
        ) : listTab === 'historyDiary' ? (
          <MissingPartsDailyJournalTab items={scopedItems} loading={loading} canExport={canExport} />
        ) : listTab === 'summary' || listTab === 'historySummary' ? (
          <MissingPartsSummaryTab
            items={filtered}
            reasons={reasons}
            departments={departments}
            orgUnits={orgUnits}
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
            canBulkSelect={canBulkSelectForTab}
            canBulkInstall={canBulkInstall}
            canExport={canExport}
            canEdit={canEdit}
            canDelete={canDelete}
            canUpdateStatus={canUpdateStatus}
            canNotes={canNotes}
            canComplete={canComplete}
            noteCounts={noteCounts}
            selectableVehicleIds={selection.selectableVehicleIds}
            selectedVehicleIds={selectedVehicleIds}
            bulkInstalling={actions.bulkActionBusy}
            completingVehicleId={actions.completingVehicleId}
            allSelectableSelected={selection.allSelectableSelected}
            someSelectableSelected={selection.someSelectableSelected}
            onToggleSelectAll={selection.toggleSelectAllVisible}
            onToggleRowSelection={selection.toggleRowSelection}
            onOpenVinList={(parts, pickComplete) => {
              const reps = uniqueVehicleReps(parts)
              const first = reps[0]
              if (!first) return
              setVinList({
                parts: reps,
                modelName: first.modelName,
                colorName: first.colorName,
                pickComplete: Boolean(pickComplete)
              })
            }}
            onRowClick={setVehicleCardParts}
            {...rowActions}
          />
        )}
      </div>

      <MissingPartsPageDialogs
        showReport={showReport}
        onCloseReport={() => setShowReport(false)}
        onReported={actions.onReported}
        updateVehicle={updateVehicle}
        onCloseUpdate={() => setUpdateVehicle(null)}
        onChanged={load}
        onNotify={showSuccess}
        onRequestTransfer={actions.openTransferRequest}
        editVehicle={editVehicle}
        onCloseEditVehicle={() => setEditVehicle(null)}
        editGroup={editGroup}
        onCloseEditGroup={() => setEditGroup(null)}
        activeItems={activeItems}
        onSaved={load}
        vinList={vinList}
        onCloseVinList={() => setVinList(null)}
        canCompleteVinList={listTab === 'active' && canComplete}
        onCompleteVinListSelected={parts => {
          setVinList(null)
          actions.requestCompletePicked(parts)
        }}
        detailTarget={detailTarget}
        onCloseDetail={() => setDetailTarget(null)}
        vehicleCardParts={vehicleCardParts}
        orgUnitLabel={vehicleCardParts?.[0] ? orgUnitLabelFor(vehicleCardParts[0].factoryOrgUnitId) : undefined}
        orgUnitLabelFor={orgUnitLabelFor}
        completingVehicleId={actions.completingVehicleId}
        transferringPartId={actions.transferringPartId}
        restoringVehicleId={actions.restoringVehicleId}
        canTransferIssue={canComplete}
        canRestoreFromArchive={canComplete}
        onRestoreFromArchive={part => actions.setRestoreTarget(part)}
        onCloseVehicleCard={() => setVehicleCardParts(null)}
        notesTarget={notesTarget}
        onCloseNotes={() => {
          setNotesTarget(null)
          void loadNoteCounts(scopedItems)
        }}
        completeTarget={actions.completeTarget}
        completeAllTargets={actions.completeAllTargets}
        completeRemaining={actions.completeRemaining}
        onConfirmComplete={() =>
          void (actions.completeAllTargets ? actions.confirmCompleteAll() : actions.confirmCompleteVehicle())
        }
        onCancelComplete={() => {
          actions.setCompleteTarget(null)
          actions.setCompleteAllTargets(null)
        }}
        transferPart={actions.transferPart}
        onConfirmTransfer={(part, stationId) => void actions.submitTransferRequest(part, stationId)}
        onCloseTransfer={() => actions.setTransferPart(null)}
        restoreTarget={actions.restoreTarget}
        onConfirmRestore={() => void actions.confirmRestoreVehicle()}
        onCancelRestore={() => actions.setRestoreTarget(null)}
      />
    </section>
  )
}
