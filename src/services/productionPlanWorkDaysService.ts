import { supabase } from '../lib/supabase'
import type { ProductionPlanWorkDays } from '../Types/productionPlanWorkDays'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = {
  plan_year: number
  plan_month: number
  working_days: number
  vacation_days: number
  overtime_days: number
}

function mapRow(row: Row): ProductionPlanWorkDays {
  return {
    year: row.plan_year,
    month: row.plan_month,
    workingDays: row.working_days,
    vacationDays: row.vacation_days,
    overtimeDays: row.overtime_days
  }
}

export async function getProductionPlanWorkDays(year: number, month: number): Promise<ProductionPlanWorkDays | null> {
  const { data, error } = await requireClient()
    .from('production_plan_working_days')
    .select('plan_year, plan_month, working_days, vacation_days, overtime_days')
    .eq('plan_year', year)
    .eq('plan_month', month)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapRow(data as Row) : null
}

export async function saveProductionPlanWorkDays(config: ProductionPlanWorkDays): Promise<void> {
  const { error } = await requireClient()
    .from('production_plan_working_days')
    .upsert(
      {
        plan_year: config.year,
        plan_month: config.month,
        working_days: Math.max(0, config.workingDays),
        vacation_days: Math.max(0, config.vacationDays),
        overtime_days: Math.max(0, config.overtimeDays)
      },
      { onConflict: 'plan_year,plan_month' }
    )

  if (error) throw new Error(error.message)
}
