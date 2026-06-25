export type EquipmentType = 'rivet_gun' | 'torque_wrench' | 'other'
export type EquipmentStatus = 'active' | 'calibration_due' | 'out_of_service' | 'scrapped'
export type EquipmentTransactionType = 'calibration' | 'scrap'
export type CalibrationResult = 'pass' | 'fail'

export const EQUIPMENT_TYPES: EquipmentType[] = ['rivet_gun', 'torque_wrench', 'other']
export const EQUIPMENT_STATUSES: EquipmentStatus[] = ['active', 'calibration_due', 'out_of_service', 'scrapped']
export const EQUIPMENT_TRANSACTION_TYPES: EquipmentTransactionType[] = ['calibration', 'scrap']
export const CALIBRATION_RESULTS: CalibrationResult[] = ['pass', 'fail']

export type LineEquipment = {
  id: string
  equipmentCode: string
  equipmentType: EquipmentType
  name: string | null
  model: string | null
  serialNumber: string | null
  location: string | null
  status: EquipmentStatus
  lastCalibrationAt: string | null
  nextCalibrationDue: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type LineEquipmentInput = {
  equipmentCode: string
  equipmentType: EquipmentType
  name?: string
  model?: string
  serialNumber?: string
  location?: string
  status?: EquipmentStatus
  notes?: string
}

export type LineEquipmentTransaction = {
  id: string
  equipmentId: string
  equipmentCode: string
  equipmentType: EquipmentType
  equipmentName: string | null
  transactionType: EquipmentTransactionType
  occurredAt: string
  calibrationResult: CalibrationResult | null
  nextCalibrationDue: string | null
  scrapReason: string | null
  scrapQty: number | null
  notes: string | null
  createdAt: string
}

export type CalibrationTransactionInput = {
  equipmentId: string
  occurredAt: string
  calibrationResult: CalibrationResult
  nextCalibrationDue?: string | null
  notes?: string
}

export type ScrapTransactionInput = {
  equipmentId: string
  occurredAt: string
  scrapReason: string
  scrapQty?: number | null
  notes?: string
}
