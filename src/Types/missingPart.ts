import type {
  MissingPartReason,
  MissingPartStatus,
  PriorityLevel,
  ResponsibleDepartment
} from './enums'

// Row shape from the `v_missing_parts_detail` view.
export type MissingPartDetail = {
  id: string
  vehicleId: string
  partDescription: string
  requiredQty: number
  installedQty: number
  remainingQty: number
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  status: MissingPartStatus
  qcApproved: boolean
  isDrItem: boolean
  notes: string | null
  vin: string
  modelName: string
  colorName: string | null
  colorHex: string | null
  stationNumber: string | null
  stationName: string | null
  createdBy: string | null
  createdByName: string | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string
}

export type ReportMissingPartInput = {
  vin: string
  modelId: string
  partDescription: string
  colorId?: string | null
  stationId?: string | null
  requiredQty: number
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  isDrItem: boolean
  notes?: string
}

export type MissingPartFilters = {
  search: string
  stationNumber: string
  priority: '' | PriorityLevel
  status: '' | MissingPartStatus
}
