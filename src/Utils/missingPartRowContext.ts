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
  const parts = filtered.filter(
    p => p.vehicleId === row.vehicleId && (isArchiveTab(listTab) || (p.status !== 'closed' && p.status !== 'cancelled'))
  )
  return {
    vehicleId: row.vehicleId,
    vin: row.vin,
    modelName: row.modelName,
    colorName: row.colorName,
    colorHex: row.colorHex,
    parts,
    allowArchived: isArchiveTab(listTab)
  }
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
