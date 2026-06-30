export const CHASSIS_VIN_LENGTH = 4

export function normalizeChassisVin(vin: string): string {
  return vin.trim()
}

export function isValidVinLength(vin: string): boolean {
  return /^\d{4}$/.test(normalizeChassisVin(vin))
}

/** @deprecated use isValidVinLength */
export const MIN_VIN_LENGTH = CHASSIS_VIN_LENGTH
