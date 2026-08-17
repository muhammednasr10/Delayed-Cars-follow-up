import type { MissingPartReason, MissingPartStatus, PriorityLevel, ResponsibleDepartment, StopperType } from './enums'

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
  completingDepartment: string | null
  followUpEmployeeId: string | null
  followUpEmployeeName: string | null
  priority: PriorityLevel
  status: MissingPartStatus
  qcApproved: boolean
  isDrItem: boolean
  stopperType: StopperType
  notes: string | null
  vin: string
  modelName: string
  colorName: string | null
  colorCode: string | null
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
  shortageResolvedAt: string | null
  /** Employee who archived/completed the vehicle shortage (المتمم). */
  shortageResolvedByName: string | null
  /** Set when closed via «ترحيل» (workflow done, shortage not physically resolved). */
  transferredAt: string | null
  pendingTransferRequestId: string | null
  pendingRestoreRequestId: string | null
  reportGroupId: string | null
  stationId: string | null
  factoryOrgUnitId: string | null
}

export type UpdateMissingPartInput = {
  partDescription: string
  requiredQty: number
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority: PriorityLevel
  stopperType: StopperType
  notes?: string
  completingDepartment?: string | null
  followUpEmployeeId?: string | null
  assignFollowUp?: boolean
}

export type MissingPartBatchLineInput = {
  partDescription: string
  requiredQty: number
  reason: MissingPartReason
  department: ResponsibleDepartment
  stationId: string | null
  completingDepartment?: string | null
  followUpEmployeeId?: string | null
}

/** Per-line input when each issue may target different VINs (legacy / grouped UI). */
export type MissingPartLineInput = MissingPartBatchLineInput & {
  vins: string[]
}

/** One reported issue spanning one or more VINs (same report_group_id). */
export type ReportGroupContext = {
  reportGroupId: string
  modelName: string
  colorName: string | null
  colorHex: string | null
  stationId: string | null
  parts: MissingPartDetail[]
  allowArchived?: boolean
}

/** Shared context when editing or updating all open issues on one vehicle. */
export type VehicleIssuesContext = {
  vehicleId: string
  vin: string
  modelName: string
  colorName: string | null
  colorHex: string | null
  parts: MissingPartDetail[]
  allowArchived?: boolean
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
  parts: MissingPartBatchLineInput[]
  colorId?: string | null
  stationId?: string | null
  factoryOrgUnitId?: string | null
  reason: MissingPartReason
  department: ResponsibleDepartment
  priority?: PriorityLevel
  stopperType?: StopperType
  notes?: string
  /** Attach new lines to an existing multi-chassis report group. */
  reportGroupId?: string | null
}

export type ReportMissingPartsBatchResult = {
  vehicle_count: number
  part_line_count: number
  missing_part_count: number
  vehicle_ids?: string[]
  report_group_id?: string | null
}

export type MissingPartFilters = {
  search: string
  modelNames: string[]
  /** Causing department (القسم المتسبب) — org unit id or legacy code. */
  departments: string[]
  /** Completing department (القسم المتمم). */
  completingDepartments: string[]
  /** Follow-up employee id; empty = all. */
  followUpEmployeeId: string
  /** Archive month key `YYYY-MM` from shortageResolvedAt; null = all months. */
  resolvedMonth: string | null
  /** Local calendar day `YYYY-MM-DD`; empty = no lower bound. */
  dateFrom: string
  /** Local calendar day `YYYY-MM-DD`; empty = no upper bound. */
  dateTo: string
}

export type MissingPartsListTab =
  'active' | 'byFamily' | 'summary' | 'history' | 'historySummary' | 'historyDiary' | 'approvals'

export type DepartmentVehicleCount = {
  department: string
  vehicleCount: number
}
