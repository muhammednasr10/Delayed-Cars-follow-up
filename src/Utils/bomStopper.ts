import type { BomItemDetail } from '../Types/bom'
import type { BomStopperType } from '../Types/engineering'

export function effectiveBomStopperType(
  row: Pick<
    BomItemDetail,
    'stopper_type' | 'operation_is_line_stopper' | 'operation_is_car_stopper'
  >
): BomStopperType {
  const st = row.stopper_type
  if (st === 'line_stopper' || st === 'car_stopper') return st
  if (row.operation_is_line_stopper) return 'line_stopper'
  if (row.operation_is_car_stopper) return 'car_stopper'
  return 'non_stopper'
}

export function bomModelsOverlap(a: BomItemDetail, b: BomItemDetail): boolean {
  const aModels = new Set<string>()
  const bModels = new Set<string>()
  if (a.vehicle_model_name) aModels.add(a.vehicle_model_name.trim().toUpperCase())
  if (b.vehicle_model_name) bModels.add(b.vehicle_model_name.trim().toUpperCase())
  for (const n of (a.applicable_models_text ?? '').split(/[,;|]/)) {
    const t = n.trim().toUpperCase()
    if (t) aModels.add(t)
  }
  for (const n of (b.applicable_models_text ?? '').split(/[,;|]/)) {
    const t = n.trim().toUpperCase()
    if (t) bModels.add(t)
  }
  if (aModels.size === 0 || bModels.size === 0) return true
  for (const m of aModels) {
    if (bModels.has(m)) return true
  }
  return false
}
