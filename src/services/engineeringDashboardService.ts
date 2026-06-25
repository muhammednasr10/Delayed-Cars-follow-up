import { supabase } from '../lib/supabase'
import type { EngineeringDashboardStats } from '../Types/engineering'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getEngineeringDashboardStats(): Promise<EngineeringDashboardStats> {
  const { data, error } = await client().from('v_engineering_dashboard').select('*').maybeSingle()
  if (error) throw new Error(error.message)
  const row = data ?? {}
  return {
    bom_rows_total: Number(row.bom_rows_total ?? 0),
    bom_unique_parts: Number(row.bom_unique_parts ?? 0),
    operations_total: Number(row.operations_total ?? 0),
    operation_parts_total: Number(row.operation_parts_total ?? 0),
    operations_without_parts: Number(row.operations_without_parts ?? 0),
    time_studies_approved: Number(row.time_studies_approved ?? 0),
    time_studies_draft: Number(row.time_studies_draft ?? 0),
    operations_without_standard_time: Number(row.operations_without_standard_time ?? 0)
  }
}
