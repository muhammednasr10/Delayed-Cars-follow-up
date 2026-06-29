export const MIN_VIN_LENGTH = 4

export function isValidVinLength(vin: string): boolean {
  return vin.trim().length >= MIN_VIN_LENGTH
}
