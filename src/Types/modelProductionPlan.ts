export const ANNUAL_PLAN_MONTH = 0

export type ModelPlanTarget = {
  modelId: string
  targetQty: number
  planYear: number
  planMonth: number
  wipCarryover?: number
  /** Models with the same id share one quantity. Totals count the group once. */
  planGroupId?: string | null
}
