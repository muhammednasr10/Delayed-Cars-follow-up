import type {
  MissingPartReason,
  MissingPartStatus,
  PriorityLevel,
  ResponsibleDepartment,
  StopperType
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
  stopperType: StopperType
  notes: string | null
  vin: string
  modelName: string
  colorName: string | null
  colorHex: string | null
  stationNumber: string | null
  stationName: string | null
  stationLineName: string | null
  stationArea: string | null
  stationDepartment: ResponsibleDepartment | null
  stationPerson: string | null
  createdBy: string | null
  createdByName: string | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string
}

export type MissingPartLineInput = {
  partDescription: string
  requiredQty: number
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
  stopperType: StopperType
  notes?: string
}

export type ReportMissingPartsBatchInput = {
  vins: string[]
  modelId: string
  parts: MissingPartLineInput[]
  colorId?: string | null
  stationId?: string | null
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  stopperType: StopperType
  notes?: string
}

export type ReportMissingPartsBatchResult = {
  vehicle_count: number
  part_line_count: number
  missing_part_count: number
}

export type MissingPartFilters = {
  search: string
  stationNumber: string
  priority: '' | PriorityLevel
  status: '' | MissingPartStatus
}
