export type VehicleModel = {
  id: string
  name: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type WorkArea = {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type Station = {
  id: string
  station_number: string
  station_name: string
  station_name_en?: string | null
  station_type?: string | null
  sort_order?: number | null
  work_area_id?: string | null
  line_name?: string | null
  responsible_department?: string | null
  responsible_person?: string | null
  headcount_workers?: number | null
  avg_station_time_minutes?: number | null
  worker1_operations_summary?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  work_areas?: Pick<WorkArea, 'id' | 'name'> | null
}

export type VehicleColor = {
  id: string
  name: string
  hex_code: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type AppUserRole = 'Admin' | 'Engineer' | 'Supervisor' | 'Viewer'

export type AppUser = {
  id: string
  name: string
  email?: string | null
  role: AppUserRole | string
  is_active: boolean
  created_at?: string
  updated_at?: string
}
