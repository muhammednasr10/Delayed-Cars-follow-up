export type EquipmentKind = {
  code: string
  labelAr: string
  labelEn: string
  manufacturer: string
  /** Theoretical range lower bound from settings. */
  rangeMin: number | null
  /** Theoretical range upper bound from settings. */
  rangeMax: number | null
  /** Display helper for theoretical range (e.g. 20–50). */
  operatingRange: string
  sortOrder: number
  isActive: boolean
}

export type EquipmentKindInput = {
  labelAr: string
  labelEn?: string
  manufacturer?: string
  rangeMin?: number | null
  rangeMax?: number | null
  operatingRange?: string
  code?: string
}

export const FALLBACK_EQUIPMENT_KINDS: EquipmentKind[] = [
  {
    code: 'rivet_gun',
    labelAr: 'مسدس برشام',
    labelEn: 'Rivet gun',
    manufacturer: '',
    rangeMin: null,
    rangeMax: null,
    operatingRange: '',
    sortOrder: 10,
    isActive: true
  },
  {
    code: 'torque_wrench',
    labelAr: 'مفتاح عزم',
    labelEn: 'Torque wrench',
    manufacturer: '',
    rangeMin: null,
    rangeMax: null,
    operatingRange: '',
    sortOrder: 20,
    isActive: true
  },
  {
    code: 'other',
    labelAr: 'أخرى',
    labelEn: 'Other',
    manufacturer: '',
    rangeMin: null,
    rangeMax: null,
    operatingRange: '',
    sortOrder: 30,
    isActive: true
  }
]
