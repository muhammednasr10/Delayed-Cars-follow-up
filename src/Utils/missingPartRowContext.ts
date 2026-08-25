import type { MissingPartDetail, MissingPartsListTab, VehicleIssuesContext } from '../Types/missingPart'
import type { VehicleNoteTarget } from '../Types/vehicleNote'
import { isReportGroup, reportGroupMembers } from './missingPartDisplay'

function isArchiveTab(listTab: MissingPartsListTab) {
  return listTab === 'history'
}

export function editableMembers(
  row: MissingPartDetail,
  filtered: MissingPartDetail[],
  listTab: MissingPartsListTab
) {
  const members = reportGroupMembers(row, filtered)
  return isArchiveTab(listTab) ? members : members.filter(p => p.status !== 'closed' && p.status !== 'cancelled')
}

export function vehicleIssuesContext(
  row: MissingPartDetail,
  filtered: MissingPartDetail[],
  listTab: MissingPartsListTab
): VehicleIssuesContext {
  const all = filtered.filter(p => p.vehicleId === row.vehicleId)
  const open = all.filter(
    p => isArchiveTab(listTab) || (p.status !== 'closed' && p.status !== 'cancelled')
  )
  const parts = open.length > 0 ? open : all
  return {
    vehicleId: row.vehicleId,
    vin: row.vin,
    modelName: row.modelName,
    colorName: row.colorName,
    colorHex: row.colorHex,
    parts,
    allowArchived: isArchiveTab(listTab) || open.length === 0
  }
}

/** Open lines when present; otherwise the closed/cancelled lines so edit/update still open. */
export function actionMembersForRow(
  row: MissingPartDetail,
  pool: MissingPartDetail[],
  listTab: MissingPartsListTab
) {
  const open = editableMembers(row, pool, listTab)
  if (open.length > 0) return { parts: open, allowArchived: isArchiveTab(listTab) }
  return { parts: reportGroupMembers(row, pool), allowArchived: true }
}

export function followUpPartsForRow(
  row: MissingPartDetail,
  filtered: MissingPartDetail[],
  listTab: MissingPartsListTab
) {
  const members = reportGroupMembers(row, filtered).filter(p => p.status !== 'closed' && p.status !== 'cancelled')
  if (isReportGroup(row, filtered)) return members
  return vehicleIssuesContext(row, filtered, listTab).parts.filter(
    p => p.status !== 'closed' && p.status !== 'cancelled'
  )
}

export function notesTargetFromPart(row: MissingPartDetail): VehicleNoteTarget {
  return {
    vehicleId: row.vehicleId,
    vin: row.vin,
    modelName: row.modelName,
    colorName: row.colorName,
    colorHex: row.colorHex
  }
}
