/** إعدادات سيناريو التغذية المحفوظة محلياً (بدون JPH أو الشفت — يأتيان من التخطيط) */
export type KanbanScenario = {
  /** حجم اللوط (سيارة/موديل) */
  lotSize: number
  /** معامل الأمان (مثلاً 1.25 = 25% احتياطي) */
  safetyFactor: number
  /** زمن التوريد من المخزن للخط (دقيقة) */
  warehouseLeadTimeMin: number
}

export const DEFAULT_KANBAN_SCENARIO: KanbanScenario = {
  lotSize: 120,
  safetyFactor: 1.25,
  warehouseLeadTimeMin: 15
}

/** معاملات الحساب من التخطيط + الإعدادات المحلية */
export type KanbanCalculationBasis = KanbanScenario & {
  jph: number
  shiftHours: number
  shiftStart: string
  shiftEnd: string
}

/** صف جزء من ملف التغذية (مثل تيجو 4 تربو) */
export type KanbanPartInput = {
  partNumber: string
  partName: string
  qtyPerVehicle: number
  rackDirection: string
  cartonDimensions: string
  cartonQty: number
  rackQty: number
  stationCode: string
}

/** نتائج حساب Kanban لجزء واحد */
export type KanbanPartResult = KanbanPartInput & {
  consumptionPerHour: number
  consumptionPerMinute: number
  taktMinutes: number
  rackCoverageMinutes: number
  replenishmentFreqMinutes: number
  reorderPointQty: number
  safetyStockQty: number
  tripsPerRackRefill: number
  partsPerLot: number
  tripsForLot: number
  replenishmentsPerShift: number
  replenishmentsPerLot: number
  lotProductionHours: number
}

export type KanbanTripGroup = {
  tripIndex: number
  parts: { partNumber: string; partName: string; qty: number; cartonQty: number }[]
  totalUnits: number
}
