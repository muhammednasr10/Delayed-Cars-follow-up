import { supabase } from '../lib/supabase'
import type { ProductionPlanGroupCode, ProductionPlanGroupTarget } from '../Types/productionPlanGroup'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type Row = { group_code: string; target_qty: number }

export async function getProductionPlanGroupTargets(): Promise<ProductionPlanGroupTarget[]> {
  const { data, error } = await requireClient()
    .from('production_plan_group_targets')
    .select('group_code, target_qty')
    .order('group_code')

  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(row => ({
    groupCode: row.group_code as ProductionPlanGroupCode,
    targetQty: row.target_qty
  }))
}

export async function saveProductionPlanGroupTarget(
  groupCode: ProductionPlanGroupCode,
  targetQty: number
): Promise<void> {
  const { error } = await requireClient()
    .from('production_plan_group_targets')
    .upsert({ group_code: groupCode, target_qty: Math.max(0, targetQty) }, { onConflict: 'group_code' })
  if (error) throw new Error(error.message)
}

export function mergePlanGroupTargets(targets: ProductionPlanGroupTarget[]): Map<ProductionPlanGroupCode, number> {
  const map = new Map<ProductionPlanGroupCode, number>()
  for (const row of targets) map.set(row.groupCode, row.targetQty)
  return map
}
