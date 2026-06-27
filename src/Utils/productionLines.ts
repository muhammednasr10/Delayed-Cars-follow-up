export const PRODUCTION_LINE_KEYS = ['body', 'paint', 'assembly'] as const
export type ProductionLineKey = (typeof PRODUCTION_LINE_KEYS)[number]

const LEGACY_TO_KEY: Record<string, ProductionLineKey> = {
  body: 'body',
  paint: 'paint',
  assembly: 'assembly',
  البودى: 'body',
  البودي: 'body',
  الدهان: 'paint',
  التجميع: 'assembly'
}

/** Map stored line_name (key or legacy Arabic) to a select value. */
export function normalizeProductionLine(value: string | null | undefined): ProductionLineKey | '' {
  const raw = value?.trim()
  if (!raw) return ''
  return LEGACY_TO_KEY[raw] ?? LEGACY_TO_KEY[raw.toLowerCase()] ?? ''
}

export function isProductionLineKey(value: string): value is ProductionLineKey {
  return (PRODUCTION_LINE_KEYS as readonly string[]).includes(value)
}
