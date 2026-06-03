import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, Archive, CheckCircle2, MessageSquare, PackageCheck, Pencil, PlusCircle, RefreshCcw, Settings2, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useMpLookups } from '../hooks/useMpLookups'
import { mpLookupLabel } from '../Utils/mpLookupLabel'
import { useCanReportMissingPart } from '../hooks/useCanReportMissingPart'
import { useCanManageMissingPart } from '../hooks/useCanManageMissingPart'
import { SetupRequired } from '../Components/SetupRequired'
import { ReportMissingPartModal } from '../Components/ReportMissingPartModal'
import { UpdateMissingPartModal, type UpdateVehicleContext } from '../Components/UpdateMissingPartModal'
import { EditMissingPartModal } from '../Components/EditMissingPartModal'
import { EditReportGroupModal } from '../Components/EditReportGroupModal'
import { VinListModal } from '../Components/VinListModal'
import type { ReportGroupContext, VehicleIssuesContext } from '../Types/missingPart'
import {
  aggregateQty,
  hasPendingInstall,
  isReportGroup,
  openPartsForDisplayRow,
  primaryItem,
  reportGroupMembers,
  toDisplayRows,
  vehicleIdsFromDisplayRow,
  type MissingPartDisplayRow
} from '../Utils/missingPartDisplay'
import { MissingPartDetailModal } from '../Components/MissingPartDetailModal'
import { VehicleNotesModal } from '../Components/VehicleNotesModal'
import type { VehicleNoteTarget } from '../Types/vehicleNote'
import {
  bulkInstallVehiclesToFull,
  completeVehicleShortage,
  deleteMissingPartRecord,
  getMissingParts
} from '../services/missingPartsService'
import type { MissingPartDetail, MissingPartFilters } from '../Types/missingPart'

type ListTab = 'active' | 'history'

const ACTIVE_COLS = ['select', 'vin', 'model', 'color', 'station', 'qty', 'reason', 'reasonClass', 'department', 'dateTime', 'actions'] as const
const HISTORY_COLS = ['vin', 'model', 'color', 'station', 'qty', 'reason', 'reasonClass', 'department', 'dateTime', 'resolvedAt'] as const

const cell = 'table-cell-compact whitespace-nowrap text-center align-middle'
const actionsCell = `${cell} sticky z-10 bg-slate-900/95 shadow-[inset_8px_0_12px_rgba(0,0,0,0.3)]`
const iconSize = 'h-[18px] w-[18px]'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

function applyFilters(items: MissingPartDetail[], filters: MissingPartFilters) {
  const base = items
    .filter(i => !filters.stationNumber || i.stationNumber === filters.stationNumber)
    .filter(i => !filters.modelName || i.modelName === filters.modelName)
    .filter(i => !filters.department || i.department === filters.department)

  const q = filters.search.trim().toLowerCase()
  if (!q) return base

  const matchingGroups = new Set<string>()
  for (const i of base) {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q) && i.reportGroupId) {
      matchingGroups.add(i.reportGroupId)
    }
  }

  return base.filter(i => {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q)) return true
    return Boolean(i.reportGroupId && matchingGroups.has(i.reportGroupId))
  })
}

function canCompleteVehicle(vehicleId: string, parts: MissingPartDetail[]): boolean {
  const lines = parts.filter(p => p.vehicleId === vehicleId)
  return lines.some(
    p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled'
  )
}

function isFirstVehicleRow(list: MissingPartDetail[], index: number, vehicleId: string): boolean {
  return list.findIndex(x => x.vehicleId === vehicleId) === index
}

function formatDateTime(iso: string, lang: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
  return {
    date: d.toLocaleDateString(locale),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
}

export function MissingPartsPage() {
  const { t, lang } = useLang()
  const { reasons, departments } = useMpLookups()
  const { canReport, role } = useCanReportMissingPart()
  const { canEdit, canDelete, canInstall, canUpdateStatus, canComplete } = useCanManageMissingPart()
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

  function vehicleContext(row: MissingPartDetail): VehicleIssuesContext {
    const parts = filtered.filter(
      p => p.vehicleId === row.vehicleId && p.status !== 'closed' && p.status !== 'cancelled'
    )
    return {
      vehicleId: row.vehicleId,
      vin: row.vin,
      modelName: row.modelName,
      colorName: row.colorName,
      colorHex: row.colorHex,
      parts
    }
  }

  function openUpdate(row: MissingPartDetail) {
    const members = reportGroupMembers(row, filtered).filter(
      p => p.status !== 'closed' && p.status !== 'cancelled'
    )
    if (members.length === 0) return
    if (isReportGroup(row, filtered)) {
      setUpdateVehicle({
        vehicleId: row.vehicleId,
        vin: row.vin,
        modelName: row.modelName,
        colorName: row.colorName,
        colorHex: row.colorHex,
        parts: members
      })
    } else {
      setUpdateVehicle(vehicleContext(row))
    }
  }

  function openEdit(row: MissingPartDetail) {
    const members = reportGroupMembers(row, filtered).filter(
      p => p.status !== 'closed' && p.status !== 'cancelled'
    )
    if (members.length === 0) return
    if (isReportGroup(row, filtered) && row.reportGroupId) {
      setEditGroup({
        reportGroupId: row.reportGroupId,
        modelName: row.modelName,
        colorName: row.colorName,
        colorHex: row.colorHex,
        stationId: row.stationId,
        parts: members
      })
      setEditVehicle(null)
    } else {
      setEditVehicle(vehicleContext(row))
      setEditGroup(null)
    }
  }

  function vehicleIssueCount(vehicleId: string): number {
    return filtered.filter(
      p => p.vehicleId === vehicleId && p.status !== 'closed' && p.status !== 'cancelled'
    ).length
  }

  function openVehicleNotes(row: MissingPartDetail) {
    setNotesTarget({
      vehicleId: row.vehicleId,
      vin: row.vin,
      modelName: row.modelName,
      colorName: row.colorName,
      colorHex: row.colorHex
    })
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      setItems(await getMissingParts())
      setSetupRequired(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      setSetupRequired(isSchemaMissing(message))
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setSelectedVehicleIds(new Set())
  }, [listTab, filters])

  const stationOptions = useMemo(
    () => Array.from(new Set(items.map(i => i.stationNumber).filter(Boolean))).sort() as string[],
    [items]
  )

  const modelOptions = useMemo(
    () => Array.from(new Set(items.map(i => i.modelName).filter(Boolean))).sort(),
    [items]
  )

  const departmentFilterCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const d of departments) codes.add(d.code)
    for (const i of items) {
      if (i.department) codes.add(i.department)
    }
    return Array.from(codes).sort()
  }, [departments, items])

  const activeItems = useMemo(() => items.filter(i => !i.shortageResolvedAt), [items])
  const historyItems = useMemo(() => items.filter(i => !!i.shortageResolvedAt), [items])

  const tabSource = listTab === 'active' ? activeItems : historyItems

  const filtered = useMemo(() => applyFilters(tabSource, filters), [tabSource, filters])
  const displayRows = useMemo(() => toDisplayRows(filtered), [filtered])

  const tabVehicleCount = useMemo(() => new Set(tabSource.map(i => i.vehicleId)).size, [tabSource])
  const filteredVehicleCount = useMemo(() => new Set(filtered.map(i => i.vehicleId)).size, [filtered])
  const hasActiveFilter = Boolean(
    filters.search.trim() || filters.stationNumber || filters.modelName || filters.department
  )

  const selectableVehicleIds = useMemo(() => {
    if (!canBulkInstall) return new Set<string>()
    const ids = new Set<string>()
    for (const row of displayRows) {
      if (hasPendingInstall(openPartsForDisplayRow(row, filtered))) {
        for (const id of vehicleIdsFromDisplayRow(row)) ids.add(id)
      }
    }
    return ids
  }, [displayRows, filtered, canBulkInstall])

  const allSelectableSelected =
    selectableVehicleIds.size > 0 && [...selectableVehicleIds].every(id => selectedVehicleIds.has(id))
  const someSelectableSelected = [...selectableVehicleIds].some(id => selectedVehicleIds.has(id))

  function toggleRowSelection(displayRow: MissingPartDisplayRow) {
    const ids = vehicleIdsFromDisplayRow(displayRow).filter(id => selectableVehicleIds.has(id))
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
    if (allSelectableSelected) {
      setSelectedVehicleIds(new Set())
      return
    }
    setSelectedVehicleIds(new Set(selectableVehicleIds))
  }

  async function bulkInstallSelected() {
    if (!canBulkInstall || selectedVehicleIds.size === 0) return
    const ids = [...selectedVehicleIds]
    const pendingLines = filtered.filter(
      p =>
        ids.includes(p.vehicleId) &&
        p.status !== 'closed' &&
        p.status !== 'cancelled' &&
        p.installedQty < p.requiredQty
    )
    if (pendingLines.length === 0) {
      setError(t('mp.bulk.nothingToInstall'))
      return
    }
    if (
      !window.confirm(
        t('mp.bulk.installConfirm', { vehicles: ids.length, lines: pendingLines.length })
      )
    ) {
      return
    }
    setBulkInstalling(true)
    setError('')
    try {
      const result = await bulkInstallVehiclesToFull(ids, filtered)
      setSelectedVehicleIds(new Set())
      showSuccess(t('mp.bulk.installSuccess', { vehicles: result.vehicles, lines: result.lines }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
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
    load()
  }

  async function removeDisplayRow(displayRow: MissingPartDisplayRow) {
    const targets = displayRow.kind === 'group' ? displayRow.items : [displayRow.item]
    const label =
      targets.length > 1
        ? t('mp.deleteGroupConfirm', { n: targets.length, part: targets[0].partDescription })
        : t('mp.deleteConfirm', { part: targets[0].partDescription })
    if (!window.confirm(label)) return
    setError('')
    try {
      for (const row of targets) await deleteMissingPartRecord(row.id)
      showSuccess(t('common.deleted'))
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  async function completeVehicle(row: MissingPartDetail) {
    if (!window.confirm(t('mp.completeConfirm', { vin: row.vin }))) return
    setCompletingVehicleId(row.vehicleId)
    setError('')
    try {
      await completeVehicleShortage(row.vehicleId)
      showSuccess(t('mp.completeSuccess', { vin: row.vin }))
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setCompletingVehicleId(null)
    }
  }

  function renderActions(i: MissingPartDetail, displayRow: MissingPartDisplayRow) {
    const rowOpen = i.status !== 'closed' && i.status !== 'cancelled'
    const isGroup = displayRow.kind === 'group'
    const canArchiveVehicle = canCompleteVehicle(i.vehicleId, filtered)
    const showCompleteBtn =
      listTab === 'active' && canComplete && canArchiveVehicle && !isGroup && isFirstVehicleRow(filtered, filtered.indexOf(i), i.vehicleId)
    const issueCount = isGroup ? displayRow.items.length : vehicleIssueCount(i.vehicleId)

    return (
      <td className={actionsCell} style={{ insetInlineEnd: 0 }}>
        <div className="flex items-center justify-center gap-1">
          <IconBtn title={t('mp.thread.open')} onClick={() => openVehicleNotes(i)} className="text-cyan-400 hover:bg-cyan-500/20">
            <MessageSquare className={iconSize} />
          </IconBtn>
          {rowOpen && canEdit && (
            <IconBtn
              title={t('mp.edit.editVehicle', { n: issueCount })}
              onClick={() => openEdit(i)}
              className="text-slate-200 hover:bg-slate-700"
            >
              <Pencil className={iconSize} />
            </IconBtn>
          )}
          {rowOpen && canUpdateStatus && (
            <IconBtn
              title={t('mp.act.updateVehicle', { n: issueCount })}
              onClick={() => openUpdate(i)}
              className="text-cyan-300 hover:bg-cyan-500/20"
            >
              <Settings2 className={iconSize} />
            </IconBtn>
          )}
          {rowOpen && canDelete && (
            <IconBtn title={t('common.delete')} onClick={() => void removeDisplayRow(displayRow)} className="text-red-300 hover:bg-red-500/20">
              <Trash2 className={iconSize} />
            </IconBtn>
          )}
          {rowOpen && showCompleteBtn && (
            <IconBtn
              title={t('mp.complete')}
              onClick={() => void completeVehicle(i)}
              className={`text-emerald-400 hover:bg-emerald-500/20 ${completingVehicleId === i.vehicleId ? 'opacity-35' : ''}`}
            >
              <CheckCircle2 className={iconSize} />
            </IconBtn>
          )}
        </div>
      </td>
    )
  }

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <section className="space-y-5">
      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/15 p-3 text-red-300"><AlertTriangle className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-black text-white">{t('mp.title')}</h2>
                <p className="text-sm text-slate-400">{t('mp.subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={load} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                <RefreshCcw className="inline h-4 w-4" />
              </button>
              {listTab === 'active' && (
                <button
                  type="button"
                  onClick={() => canReport && setShowReport(true)}
                  disabled={!canReport}
                  title={!canReport ? t('mp.noReportPermHint', { role }) : t('mp.report')}
                  className={`rounded-xl p-2.5 sm:flex-none ${
                    canReport
                      ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                      : 'cursor-not-allowed bg-slate-700 text-slate-500'
                  }`}
                >
                  <PlusCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setListTab('active')}
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                listTab === 'active' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t('mp.tabs.active')} ({activeItems.length})
            </button>
            <button
              type="button"
              onClick={() => setListTab('history')}
              className={`rounded-xl px-4 py-2 text-sm font-black ${
                listTab === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Archive className="mr-1 inline h-4 w-4" />
              {t('mp.tabs.history')} ({historyItems.length})
            </button>
          </div>

          {listTab === 'active' && !canReport && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {t('mp.noReportPermHint', { role })}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className="input-dark" placeholder={t('mp.searchPlaceholder')} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
            <select className="input-dark" value={filters.stationNumber} onChange={e => setFilters(p => ({ ...p, stationNumber: e.target.value }))}>
              <option value="">{t('mp.filterStation')}</option>
              {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input-dark" value={filters.modelName} onChange={e => setFilters(p => ({ ...p, modelName: e.target.value }))}>
              <option value="">{t('mp.filterModel')}</option>
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="input-dark" value={filters.department} onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}>
              <option value="">{t('mp.filterDepartment')}</option>
              {departmentFilterCodes.map(code => (
                <option key={code} value={code}>{mpLookupLabel(departments, code, lang)}</option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-sm font-bold text-cyan-300">
            {hasActiveFilter
              ? t('mp.filterVehicleCountFiltered', { n: filteredVehicleCount, total: tabVehicleCount })
              : t('mp.filterVehicleCount', { n: filteredVehicleCount })}
          </p>
          {listTab === 'active' && (
            <p className="mt-2 text-xs text-slate-500">{t('mp.completeSeparateHint')}</p>
          )}
        </div>

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

        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-slate-950/90">
              <tr>
                {(listTab === 'history' ? HISTORY_COLS : ACTIVE_COLS).map(c => (
                  <th
                    key={c}
                    className={`${c === 'actions' ? actionsCell : cell} font-black uppercase text-slate-400`}
                    style={c === 'actions' ? { insetInlineEnd: 0 } : undefined}
                  >
                    {c === 'select' && canBulkInstall ? (
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        ref={el => {
                          if (el) el.indeterminate = someSelectableSelected && !allSelectableSelected
                        }}
                        onChange={toggleSelectAllVisible}
                        disabled={selectableVehicleIds.size === 0 || bulkInstalling}
                        title={t('mp.bulk.selectAll')}
                        className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-cyan-500"
                      />
                    ) : c === 'actions' || c === 'select' ? (
                      ''
                    ) : (
                      t(`mp.cols.${c === 'dateTime' ? 'dateTime' : c}`)
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayRows.map(displayRow => {
                const i = primaryItem(displayRow)
                const groupVins = displayRow.kind === 'group' ? displayRow.items.map(x => x.vin) : [i.vin]
                const qty =
                  displayRow.kind === 'group' ? aggregateQty(displayRow.items) : { installed: i.installedQty, required: i.requiredQty }
                const stationLabel = i.stationNumber
                  ? i.stationName
                    ? `${i.stationNumber} · ${i.stationName}`
                    : i.stationNumber
                  : '-'
                const { date, time } = formatDateTime(i.createdAt, lang)
                const rowVehicleIds = vehicleIdsFromDisplayRow(displayRow)
                const rowSelectable = canBulkInstall && hasPendingInstall(openPartsForDisplayRow(displayRow, filtered))
                const rowChecked =
                  rowSelectable && rowVehicleIds.filter(id => selectableVehicleIds.has(id)).every(id => selectedVehicleIds.has(id))

                return (
                  <tr
                    key={displayRow.key}
                    className={`bg-slate-900/30 hover:bg-slate-800/40 ${rowChecked ? 'ring-1 ring-inset ring-cyan-500/40' : ''}`}
                  >
                    {listTab === 'active' && (
                      <td className={cell}>
                        {canBulkInstall && (
                          <input
                            type="checkbox"
                            checked={rowChecked}
                            disabled={!rowSelectable || bulkInstalling}
                            onChange={() => toggleRowSelection(displayRow)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        )}
                      </td>
                    )}
                    <td className={`${cell} font-bold text-white`}>
                      {groupVins.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setVinList({ vins: groupVins, modelName: i.modelName, colorName: i.colorName })
                          }
                          className="text-cyan-300 hover:text-cyan-200 hover:underline"
                          title={t('mp.vinListModal.open')}
                        >
                          {t('mp.vinCount', { n: groupVins.length })}
                        </button>
                      ) : (
                        <span dir="ltr">{i.vin}</span>
                      )}
                    </td>
                    <td className={cell}>{i.modelName}</td>
                    <td className={cell}>
                      {i.colorName ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <span
                            className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
                            style={{ backgroundColor: i.colorHex ?? '#fff' }}
                          />
                          {i.colorName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={cell} title={stationLabel}>
                      {stationLabel}
                    </td>
                    <td className={cell}>
                      <span className="font-mono tabular-nums">
                        <span className="text-cyan-200">{qty.installed}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-200">{qty.required}</span>
                      </span>
                    </td>
                    <td className={cell} title={i.partDescription}>
                      <span className="mx-auto block max-w-[140px] truncate text-slate-200">{i.partDescription}</span>
                    </td>
                    <td className={cell}>
                      <button
                        type="button"
                        onClick={() => setDetailTarget(i)}
                        className="mx-auto block max-w-[120px] truncate text-cyan-300 hover:text-cyan-200 hover:underline"
                        title={t('mp.detail.title')}
                      >
                        {mpLookupLabel(reasons, i.reason, lang)}
                      </button>
                    </td>
                    <td className={cell}>{mpLookupLabel(departments, i.department, lang)}</td>
                    <td className={`${cell} text-slate-400`}>
                      <div className="leading-tight">
                        <div>{date}</div>
                        <div className="text-[10px] text-slate-500">{time}</div>
                      </div>
                    </td>
                    {listTab === 'history' && (
                      <td className={`${cell} text-emerald-300/80`}>
                        {i.shortageResolvedAt
                          ? formatDateTime(i.shortageResolvedAt, lang).date
                          : '-'}
                      </td>
                    )}
                    {listTab === 'active' && renderActions(i, displayRow)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && displayRows.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            {listTab === 'history' ? t('mp.history.empty') : t('common.noResults')}
          </div>
        )}
      </div>

      <ReportMissingPartModal open={showReport} onClose={() => setShowReport(false)} onReported={onReported} />
      <UpdateMissingPartModal vehicle={updateVehicle} onClose={() => setUpdateVehicle(null)} onChanged={load} />
      <EditMissingPartModal vehicle={editVehicle} onClose={() => setEditVehicle(null)} onSaved={load} />
      <EditReportGroupModal group={editGroup} onClose={() => setEditGroup(null)} onSaved={load} />
      <VinListModal
        vins={vinList?.vins ?? null}
        modelName={vinList?.modelName}
        colorName={vinList?.colorName}
        onClose={() => setVinList(null)}
      />
      <MissingPartDetailModal part={detailTarget} onClose={() => setDetailTarget(null)} />
      <VehicleNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />
    </section>
  )
}

function IconBtn({
  title,
  onClick,
  className,
  children
}: {
  title: string
  onClick: () => void
  className: string
  children: ReactNode
}) {
  return (
    <button type="button" title={title} onClick={onClick} className={`rounded-md p-1.5 ${className}`}>
      {children}
    </button>
  )
}
