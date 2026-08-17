/** Display label like أبيض-11U (name-CODE). */
export function formatVehicleColorLabel(
  name: string | null | undefined,
  code?: string | null
): string | null {
  const n = name?.trim()
  if (!n) return null
  const c = code?.trim()
  if (!c) return n
  return `${n}-${c.toUpperCase()}`
}
