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
  work_area_id?: string | null
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
