export const PRODUCTION_PLAN_GROUP_CODES = ['t_lines'] as const

export type ProductionPlanGroupCode = (typeof PRODUCTION_PLAN_GROUP_CODES)[number]

export type ProductionPlanGroupTarget = {
  groupCode: ProductionPlanGroupCode
  targetQty: number
}
