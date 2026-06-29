import { useEffect, useMemo, useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { useCanReportMissingPart } from '../../hooks/useCanReportMissingPart'
import { useCanManageMissingPart } from '../../hooks/useCanManageMissingPart'
import { useFormatError } from '../../hooks/useFormatError'
import { SetupRequired } from '../../Components/SetupRequired'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { UpdateMissingPartModal, type UpdateVehicleContext } from '../../Components/UpdateMissingPartModal'
import { EditMissingPartModal } from '../../Components/EditMissingPartModal'
import { EditReportGroupModal } from '../../Components/EditReportGroupModal'
import { VinListModal } from '../../Components/VinListModal'
import type { ReportGroupContext, VehicleIssuesContext } from '../../Types/missingPart'
import {
  buildMissingPartTableRows,
  hasPendingInstall,
  isReportGroup,
  partsFromTableRow,
  reportGroupMembers,
  vehicleIdsFromTableRow,
  type MissingPartTableRow
} from '../../Utils/missingPartDisplay'
import { MissingPartDetailModal } from '../../Components/MissingPartDetailModal'
import { VehicleNotesModal } from '../../Components/VehicleNotesModal'
import type { VehicleNoteTarget } from '../../Types/vehicleNote'
import {
  bulkInstallVehiclesToFull,
  completeVehicleShortage,
  deleteMissingPartRecord,
  getMissingParts
} from '../../services/missingPartsService'
import type { MissingPartDetail, MissingPartFilters } from '../../Types/missingPart'
import { MissingPartsToolbar, type ListTab } from '../../Components/missingParts/MissingPartsToolbar'
import { MissingPartsTable } from '../../Components/missingParts/MissingPartsTable'
import { MissingPartsSummaryTab } from '../../Components/missingParts/MissingPartsSummaryTab'
import { applyFilters, isSchemaMissing, openVehicleShortageLines, remainingInstallLineCount } from '../../Utils/missingPartPageUtils'
import { ConfirmDialog } from '../../Components/ConfirmDialog'

export function MissingPartsPage() {
  const { t } = useLang()
  const { reasons, departments } = useMpLookups()
  const { canReport, role } = useCanReportMissingPart()
  const { canEdit, canDelete, canInstall, canUpdateStatus, canComplete } = useCanManageMissingPart()
  const formatError = useFormatError()
  const canBulkInstall = canInstall && canUpdateStatus

  const [items, setItems] = useState<MissingPartDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [listTab, setListTab] = useState<ListTab>('active')
  const [filters, setFilters] = useState<MissingPartFilters>({ search: '', stationNumber: '', modelName: '', department: '' })
  const [showReport, setShowReport] = useState(false)
  const [updateVehicle, setUpdateVehicle] = useState<UpdateVehicleContext | null>(null)
  const [editVehicle, setEditVehicle] = useState<VehicleIssuesContext | null>(null)
  const [editGroup, setEditGroup] = useState<ReportGroupContext | null>(null)
  const [vinList, setVinList] = useState<{ vins: string[]; modelName: string; colorName: string | null } | null>(null)
  const [detailTarget, setDetailTarget] = useState<MissingPartDetail | null>(null)
  const [notesTarget, setNotesTarget] = useState<VehicleNoteTarget | null>(null)
  const [success, setSuccess] = useState('')
  const [completingVehicleId, setCompletingVehicleId] = useState<string | null>(null)
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set())
  const [bulkInstalling, setBulkInstalling] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<MissingPartDetail | null>(null)

  function editableMembers(row: MissingPartDetail) {
    const members = reportGroupMembers(row, filtered)
    return listTab === 'history' ? members : members.filter(p => p.status !== 'closed' && p.status !== 'cancelled')
  }

  function vehicleContext(row: MissingPartDetail): VehicleIssuesContext {
    const parts = filtered.filter(
      p => p.vehicleId === row.vehicleId && (listTab === 'history' || (p.status !== 'closed' && p.status !== 'cancelled'))
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

  const stationOptions = useMemo(
    () => Array.from(new Set(items.map(i => i.stationNumber).filter(Boolean))).sort() as string[],
    [items]
  )
  const modelOptions = useMemo(() => Array.from(new Set(items.map(i => i.modelName).filter(Boolean))).sort(), [items])
  const departmentFilterCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const d of departments) codes.add(d.code)
    for (const i of items) if (i.department) codes.add(i.department)
    return Array.from(codes).sort()
  }, [departments, items])

  const activeItems = useMemo(() => items.filter(i => !i.shortageResolvedAt), [items])
  const historyItems = useMemo(() => items.filter(i => !!i.shortageResolvedAt), [items])
  const activeVehicleCount = useMemo(() => new Set(activeItems.map(i => i.vehicleId)).size, [activeItems])
  const historyVehicleCount = useMemo(() => new Set(historyItems.map(i => i.vehicleId)).size, [historyItems])
  const tabSource = listTab === 'history' ? historyItems : activeItems
  const filtered = useMemo(() => applyFilters(tabSource, filters), [tabSource, filters])
  const tableRows = useMemo(() => buildMissingPartTableRows(filtered), [filtered])
  const tabVehicleCount = useMemo(() => new Set(tabSource.map(i => i.vehicleId)).size, [tabSource])
  const filteredVehicleCount = useMemo(() => new Set(filtered.map(i => i.vehicleId)).size, [filtered])
  const hasActiveFilter = Boolean(filters.search.trim() || filters.stationNumber || filters.modelName || filters.department)

  const selectableVehicleIds = useMemo(() => {
    if (!canBulkInstall) return new Set<string>()
    const ids = new Set<string>()
    for (const row of tableRows) {
      const parts = partsFromTableRow(row).filter(p => p.status !== 'closed' && p.status !== 'cancelled')
      if (hasPendingInstall(parts)) {
        for (const id of vehicleIdsFromTableRow(row)) ids.add(id)
      }
    }
    return ids
  }, [tableRows, canBulkInstall])

  const allSelectableSelected = selectableVehicleIds.size > 0 && [...selectableVehicleIds].every(id => selectedVehicleIds.has(id))
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
      p => ids.includes(p.vehicleId) && p.status !== 'closed' && p.status !== 'cancelled' && p.installedQty < p.requiredQty
    )
    if (pendingLines.length === 0) {
      setError(t('mp.bulk.nothingToInstall'))
      return
    }
    if (!window.confirm(t('mp.bulk.installConfirm', { vehicles: ids.length, lines: pendingLines.length }))) return
    setBulkInstalling(true)
    setError('')
    try {
      const result = await bulkInstallVehiclesToFull(ids, filtered)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.bulk.installSuccess', { vehicles: result.vehicles, lines: result.lines }))
      await load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBulkInstalling(false)
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
    setCompleteTarget(row)
  }

  async function confirmCompleteVehicle() {
    if (!completeTarget) return
    setCompletingVehicleId(completeTarget.vehicleId)
    setError('')
    try {
      await completeVehicleShortage(completeTarget.vehicleId)
      setCompleteTarget(null)
      showSuccess(t('mp.completeSuccess', { vin: completeTarget.vin }))
      void load()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setCompletingVehicleId(null)
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
          onListTabChange={setListTab}
          activeCount={activeVehicleCount}
          historyCount={historyVehicleCount}
          searchPool={tabSource}
          filters={filters}
          onFiltersChange={patch => setFilters(p => ({ ...p, ...patch }))}
          stationOptions={stationOptions}
          modelOptions={modelOptions}
          departmentFilterCodes={departmentFilterCodes}
          departments={departments}
          canReport={canReport}
          role={role}
          onReport={() => setShowReport(true)}
        />

        {success && <div className="m-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
        {error && !setupRequired && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {listTab === 'active' && canBulkInstall && selectedVehicleIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
            <span className="text-sm font-bold text-slate-300">{t('mp.bulk.selected', { n: selectedVehicleIds.size })}</span>
            <button
              type="button"
              disabled={bulkInstalling}
              onClick={() => void bulkInstallSelected()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <PackageCheck className="h-4 w-4" />
              {t('mp.bulk.installSelected')}
            </button>
            <button
              type="button"
              disabled={bulkInstalling}
              onClick={() => setSelectedVehicleIds(new Set())}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              {t('mp.bulk.clearSelection')}
            </button>
          </div>
        )}

        {listTab === 'summary' ? (
          <MissingPartsSummaryTab
            items={filtered}
            reasons={reasons}
            departments={departments}
            hasActiveFilter={hasActiveFilter}
            filteredVehicleCount={filteredVehicleCount}
            tabVehicleCount={tabVehicleCount}
          />
        ) : (
          <MissingPartsTable
            listTab={listTab}
            filtered={filtered}
            loading={loading}
            reasons={reasons}
            departments={departments}
            canBulkInstall={canBulkInstall}
            canEdit={canEdit}
            canDelete={canDelete}
            canUpdateStatus={canUpdateStatus}
            canComplete={canComplete}
            selectableVehicleIds={selectableVehicleIds}
            selectedVehicleIds={selectedVehicleIds}
            bulkInstalling={bulkInstalling}
            completingVehicleId={completingVehicleId}
            allSelectableSelected={allSelectableSelected}
            someSelectableSelected={someSelectableSelected}
            onToggleSelectAll={toggleSelectAllVisible}
            onToggleRowSelection={toggleRowSelection}
            onOpenVinList={(vins, modelName, colorName) => setVinList({ vins, modelName, colorName })}
            onOpenDetail={setDetailTarget}
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
          />
        )}
      </div>

      <ReportMissingPartModal open={showReport} onClose={() => setShowReport(false)} onReported={onReported} />
      <UpdateMissingPartModal vehicle={updateVehicle} onClose={() => setUpdateVehicle(null)} onChanged={load} />
      <EditMissingPartModal vehicle={editVehicle} onClose={() => setEditVehicle(null)} onSaved={load} />
      <EditReportGroupModal group={editGroup} onClose={() => setEditGroup(null)} onSaved={load} />
      <VinListModal vins={vinList?.vins ?? null} modelName={vinList?.modelName} colorName={vinList?.colorName} onClose={() => setVinList(null)} />
      <MissingPartDetailModal part={detailTarget} onClose={() => setDetailTarget(null)} />
      <VehicleNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title={completeRemaining > 0 ? t('mp.completePartialTitle') : t('mp.complete')}
        message={
          completeTarget
            ? completeRemaining > 0
              ? t('mp.completePartialMessage', { vin: completeTarget.vin, n: completeRemaining })
              : t('mp.completeConfirm', { vin: completeTarget.vin })
            : ''
        }
        confirmLabel={completeRemaining > 0 ? t('mp.completePartialYes') : t('common.confirm')}
        cancelLabel={completeRemaining > 0 ? t('mp.completePartialNo') : t('common.cancel')}
        tone="default"
        busy={completingVehicleId === completeTarget?.vehicleId}
        onConfirm={() => void confirmCompleteVehicle()}
        onCancel={() => setCompleteTarget(null)}
      />
    </section>
  )
}
