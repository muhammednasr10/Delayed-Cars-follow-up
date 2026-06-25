import type { TrainingLevel } from './enums'

export type EngineeringTaskKind =
  | 'install'
  | 'fit'
  | 'torque'
  | 'connect'
  | 'clip'
  | 'inspect'
  | 'adjust'
  | 'test'
  | 'other'

export type OperationSide =
  | 'RH'
  | 'LH'
  | 'front'
  | 'rear'
  | 'upper'
  | 'lower'
  | 'interior'
  | 'exterior'
  | 'none'

export type OperationPartUsageType =
  | 'main_part'
  | 'fastener'
  | 'clip'
  | 'hardware'
  | 'consumable'
  | 'tool_reference'
  | 'other'

export type BomStopperType = 'line_stopper' | 'car_stopper' | 'non_stopper'

export type TimeStudyMeasurementScope = 'station' | 'worker' | 'operation'

export type TimeStudyStatus = 'draft' | 'under_review' | 'approved' | 'rejected' | 'archived'

export type RoutingClassification =
  | 'common_within_model_family'
  | 'model_specific'
  | 'optional'

export type OperationPartRow = {
  id: string
  operation_id: string
  part_id: string
  bom_item_id: string | null
  quantity: number
  unit: string | null
  usage_type: OperationPartUsageType
  notes: string | null
  is_active: boolean
  part_number?: string
  part_name_ar?: string | null
  normalized_part_number?: string
}

export type OperationPartInput = {
  operation_id: string
  part_id: string
  bom_item_id?: string | null
  quantity: number
  unit?: string
  usage_type?: OperationPartUsageType
  notes?: string
}

export type TimeStudy = {
  id: string
  vehicle_model_id: string | null
  station_id: string
  operation_id: string
  study_code: string
  study_date: string
  measurement_scope: TimeStudyMeasurementScope
  worker_station_id: string | null
  subject_label: string | null
  measured_by_name: string | null
  operator_employee_id: string | null
  observer_employee_id: string | null
  rating_factor: number
  allowance_factor: number
  takt_time_seconds: number | null
  average_observed_time_seconds: number | null
  normal_time_seconds: number | null
  standard_time_seconds: number | null
  required_manpower: number | null
  status: TimeStudyStatus
  approved_at: string | null
  notes: string | null
  operation_name_ar?: string
  station_name?: string
  vehicle_model_name?: string
}

export type TimeStudyReading = {
  id: string
  time_study_id: string
  cycle_no: number
  observed_time_seconds: number
  is_outlier: boolean
  exclude_from_avg: boolean
  outlier_reason: string | null
  notes: string | null
}

export type TimeStudyCreateInput = {
  vehicle_model_id?: string | null
  station_id: string
  operation_id: string
  measurement_scope?: TimeStudyMeasurementScope
  worker_station_id?: string | null
  subject_label?: string | null
  measured_by_name?: string | null
  study_date?: string
  rating_factor?: number
  allowance_factor?: number
  takt_time_seconds?: number | null
  notes?: string
}

export type TimeStudyMeasureSession = {
  modelLine: string
  vehicleModelId: string | null
  scope: TimeStudyMeasurementScope
  parentStationId: string
  parentDisplayCode: string
  parentStationName: string
  workerStationId: string | null
  workerDisplayCode: string | null
  operationId: string
  operationName: string
  stationId: string
  subjectLabel: string
}

export type ModelRoutingRow = {
  id: string
  vehicle_model_id: string | null
  model_family_id: string | null
  station_id: string
  operation_id: string
  sequence_no: number
  operation_type: string
  routing_class: RoutingClassification | null
  required_level: TrainingLevel
  required_manpower_count: number
  standard_time_seconds: number | null
  takt_time_seconds: number | null
  is_required: boolean
  is_active: boolean
  notes: string | null
  operation_name_ar?: string
  station_name?: string
  station_number?: string
}

export type EngineeringDashboardStats = {
  bom_rows_total: number
  bom_unique_parts: number
  operations_total: number
  operation_parts_total: number
  operations_without_parts: number
  time_studies_approved: number
  time_studies_draft: number
  operations_without_standard_time: number
}
