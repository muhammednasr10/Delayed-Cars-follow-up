import { supabase } from '../lib/supabase'
import type { ModelPlanTarget } from '../Types/modelProductionPlan'
import type { ProductionOrder } from '../Types/production'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type TargetRow = {
  model_id: string
  target_qty: number
}

export async function getModelPlanTargets(): Promise<ModelPlanTarget[]> {
  const { data, error } = await requireClient()
    .from('model_production_plan_targets')
    .select('model_id, target_qty')
    .order('model_id')

  if (error) throw new Error(error.message)
  return ((data ?? []) as TargetRow[]).map(row => ({
    modelId: row.model_id,
    targetQty: row.target_qty
  }))
}

export async function saveModelPlanTargets(targets: ModelPlanTarget[]): Promise<void> {
  if (targets.length === 0) return
  const { error } = await requireClient()
    .from('model_production_plan_targets')
    .upsert(
      targets.map(t => ({
        model_id: t.modelId,
        target_qty: Math.max(0, t.targetQty)
      })),
      { onConflict: 'model_id' }
    )
  if (error) throw new Error(error.message)
}

/** DB targets override; otherwise seed from production order quantities. */
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
