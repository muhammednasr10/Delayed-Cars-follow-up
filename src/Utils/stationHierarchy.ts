/** PBS1 → PBS-01, ST12 → ST-12 for display */
export function formatStationDisplayCode(code: string): string {
  const c = code.trim().toUpperCase()
  const pbs = c.match(/^PBS(\d+)$/i)
  if (pbs) return `PBS-${pbs[1].padStart(2, '0')}`
  const st = c.match(/^ST(\d+)$/i)
  if (st) return `ST-${st[1].padStart(2, '0')}`
  return code
}

/** PBS-01 / ST-01 → PBS01-L1 — أو يحافظ على لاحقة العامل إن وُجدت */
export function formatStationWorkerDisplayCode(stationNumber: string): string {
  const { base, workerSuffix } = parseStationNumberParts(stationNumber)
  return `${base}-${workerSuffix}`
}

export function normalizeStationBaseCode(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, '')
}

/** يفكك رقم المحطة إلى الأساس والعامل — PBS-01 → PBS01 + L1 */
export function parseStationNumberParts(stationNumber: string): { base: string; workerSuffix: string } {
  const raw = stationNumber.trim()
  const worker = raw.match(/^(.+?)-(L\d+)$/i)
  if (worker) {
    return { base: normalizeStationBaseCode(worker[1]), workerSuffix: worker[2].toUpperCase() }
  }
  return { base: normalizeStationBaseCode(raw), workerSuffix: 'L1' }
}

export function composeStationNumber(base: string, workerSuffix: string): string {
  const b = normalizeStationBaseCode(base)
  if (!b) return ''
  const w = /^L\d+$/i.test(workerSuffix.trim()) ? workerSuffix.trim().toUpperCase() : 'L1'
  return `${b}-${w}`
}

/** كود المحطة المرجعي بدون لاحقة عامل — PBS01 أو يُزيل -L1 من القيم القديمة */
export function normalizeStationReferenceCode(stationNumber: string): string {
  const { base } = parseStationNumberParts(stationNumber)
  return normalizeStationBaseCode(base)
}

/** كود المحطة كما يُخزَّن في DB — يحافظ على L1، L2… لخطوط العمال */
export function normalizeStationNumberForSave(stationNumber: string): string {
  const raw = stationNumber.trim()
  if (/-L\d+$/i.test(raw)) {
    const { base, workerSuffix } = parseStationNumberParts(raw)
    return composeStationNumber(base, workerSuffix)
  }
  return normalizeStationReferenceCode(raw)
}

/** عرض كود المحطة في المرجع — PBS-01 بدون L1 */
export function formatStationReferenceCode(stationNumber: string): string {
  return formatStationDisplayCode(normalizeStationReferenceCode(stationNumber))
}

/** هل كود المحطة المرجعي مستخدم مسبقاً؟ */
export function stationReferenceExists(
  existingStationNumbers: string[],
  code: string,
  excludeStationNumber?: string,
  alsoExcludeStationNumbers?: string[]
): boolean {
  const norm = normalizeStationReferenceCode(code)
  if (!norm) return false
  const excludeNorms = new Set<string>()
  if (excludeStationNumber) excludeNorms.add(normalizeStationReferenceCode(excludeStationNumber))
  for (const num of alsoExcludeStationNumbers ?? []) {
    if (num.trim()) excludeNorms.add(normalizeStationReferenceCode(num))
  }
  const exactExcludes = new Set(
    [excludeStationNumber, ...(alsoExcludeStationNumbers ?? [])]
      .filter((n): n is string => Boolean(n?.trim()))
      .map(n => n.trim().toUpperCase())
  )
  return existingStationNumbers.some(num => {
    const trimmed = num.trim()
    if (exactExcludes.has(trimmed.toUpperCase())) return false
    const existing = normalizeStationReferenceCode(num)
    if (excludeNorms.has(existing)) return false
    return existing === norm
  })
}

/** اقتراح كود محطة تالي غير مستخدم — ST17 أو PBS04 */
export function suggestNextStationCode(existingStationNumbers: string[], prefix: 'ST' | 'PBS'): string {
  const existing = new Set(existingStationNumbers.map(normalizeStationReferenceCode))
  const re = new RegExp(`^${prefix}(\\d+)$`, 'i')
  let max = 0
  for (const code of existing) {
    const m = code.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  for (let n = max + 1; n < max + 500; n++) {
    const padded = `${prefix}${String(n).padStart(2, '0')}`
    const plain = `${prefix}${n}`
    if (!existing.has(padded) && !existing.has(plain)) return padded
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}

export function stationCodePrefix(stationNumber: string): 'ST' | 'PBS' {
  return normalizeStationReferenceCode(stationNumber).match(/^PBS/i) ? 'PBS' : 'ST'
}

/** L1، L2… للمحطة التالية بنفس الأساس */
export function nextWorkerSuffix(existingStationNumbers: string[], base: string, excludeStationNumber?: string): string {
  const normBase = normalizeStationBaseCode(base)
  if (!normBase) return 'L1'
  let max = 0
  for (const num of existingStationNumbers) {
    if (excludeStationNumber && num.trim() === excludeStationNumber.trim()) continue
    const parts = parseStationNumberParts(num)
    if (parts.base !== normBase) continue
    const idx = workerIndexFromStationCode(composeStationNumber(parts.base, parts.workerSuffix)) ?? 1
    max = Math.max(max, idx)
  }
  return `L${max + 1}`
}

/** PBS1-L1 → PBS1 */
export function inferParentStationCode(stationNumber: string): string | null {
  const m = stationNumber.trim().toUpperCase().match(/^(.+)-(L\d+)$/i)
  return m ? m[1] : null
}

/** PBS1-L1 → 1 */
export function workerIndexFromStationCode(stationNumber: string): number | null {
  const m = stationNumber.trim().toUpperCase().match(/-L(\d+)$/i)
  return m ? Number(m[1]) : null
}
