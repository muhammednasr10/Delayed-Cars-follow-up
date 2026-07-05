export const ANNUAL_PLAN_MONTH = 0

export type ModelPlanTarget = {
  modelId: string
  targetQty: number
  planYear: number
  planMonth: number
  wipCarryover?: number
}
