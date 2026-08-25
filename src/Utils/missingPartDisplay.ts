/** Barrel: display helpers + table row builder for missing-parts list. */
export {
  aggregateQty,
  hasPendingInstall,
  isReportGroup,
  multiReportGroupPartIds,
  openPartsForDisplayRow,
  primaryItem,
  reportGroupMembers,
  toDisplayRows,
  vehicleIdsFromDisplayRow,
  type MissingPartDisplayRow
} from './missingPartDisplayCore'

export {
  buildMissingPartTableRows,
  partsForVehicleAction,
  partsFromTableRow,
  vehicleIdsFromTableRow,
  type MissingPartTableRow,
  type MissingPartTableSort
} from './missingPartTableRows'
