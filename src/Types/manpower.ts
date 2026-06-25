export type AllocationShift = 'day' | 'evening' | 'night'

export type ManpowerAllocationDay = {
  id: string
  allocation_date: string
  shift: AllocationShift
  vehicle_model_id: string | null
  notes: string | null
  status: 'draft' | 'confirmed'
  vehicle_model_name?: string
}

export type ManpowerAllocationLine = {
  id: string
  day_id: string
  allocation_date: string
  shift: AllocationShift
  vehicle_model_id: string | null
  vehicle_model_name: string | null
  operation_id: string
  operation_name_ar: string
  operation_code: string
  station_id: string
  station_number: string
  station_name: string
  slot_no: number
  required_manpower: number
  standard_time_seconds: number | null
  assigned_employee_id: string | null
  employee_code: string | null
  employee_name: string | null
  warnings: string[]
  is_override: boolean
  override_reason: string | null
  notes: string | null
}

export type ManpowerWarningCode =
  | 'absent'
  | 'not_qualified'
  | 'training_expired'
  | 'in_training'
  | 'level_too_low'
  | 'understaffed'
