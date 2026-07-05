import { supabase } from '../lib/supabase'
import type { ModelPlanTarget } from '../Types/modelProductionPlan'
import { ANNUAL_PLAN_MONTH } from '../Types/modelProductionPlan'
import type { ProductionOrder } from '../Types/production'

export { ANNUAL_PLAN_MONTH }

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type TargetRow = {
  model_id: string
  target_qty: number
  plan_year: number
  plan_month: number
  wip_carryover_qty?: number
}

function mapRow(row: TargetRow): ModelPlanTarget {
  return {
    modelId: row.model_id,
    targetQty: row.target_qty,
    planYear: row.plan_year,
    planMonth: row.plan_month,
    wipCarryover: Number(row.wip_carryover_qty) || 0
  }
}

export async function getModelPlanTargets(year: number, month: number): Promise<ModelPlanTarget[]> {
  const { data, error } = await requireClient()
    .from('model_production_plan_targets')
    .select('model_id, target_qty, plan_year, plan_month, wip_carryover_qty')
    .eq('plan_year', year)
    .eq('plan_month', month)
    .order('model_id')

  if (error) throw new Error(error.message)
  return ((data ?? []) as TargetRow[]).map(mapRow)
}

export async function getAnnualPlanTargets(year: number): Promise<ModelPlanTarget[]> {
  return getModelPlanTargets(year, ANNUAL_PLAN_MONTH)
}

export async function saveModelPlanTargets(targets: ModelPlanTarget[]): Promise<void> {
  if (targets.length === 0) return
  const { error } = await requireClient()
    .from('model_production_plan_targets')
    .upsert(
      targets.map(t => ({
        model_id: t.modelId,
        target_qty: Math.max(0, t.targetQty),
        plan_year: t.planYear,
        plan_month: t.planMonth,
        wip_carryover_qty: Math.max(0, t.wipCarryover ?? 0)
      })),
      { onConflict: 'model_id,plan_year,plan_month' }
    )
  if (error) throw new Error(error.message)
}

/** أهداف الشهر من قاعدة البيانات فقط (بدون بذرة من الأوامر). */
export function planTargetsMap(dbTargets: ModelPlanTarget[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const target of dbTargets) map.set(target.modelId, target.targetQty)
  return map
}

export function wipCarryoverMap(dbTargets: ModelPlanTarget[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const target of dbTargets) {
    if (target.wipCarryover && target.wipCarryover > 0) {
      map.set(target.modelId, target.wipCarryover)
    }
  }
  return map
}

/** @deprecated استخدم planTargetsMap — البذرة من الأوامر لم تعد مناسبة لخطة شهرية */
export function mergePlanTargets(
  dbTargets: ModelPlanTarget[],
  orders: ProductionOrder[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const order of orders) {
    if (!order.modelId) continue
    map.set(order.modelId, (map.get(order.modelId) ?? 0) + order.plannedQty)
  }
  for (const target of dbTargets) {
    map.set(target.modelId, target.targetQty)
  }
  return map
}
