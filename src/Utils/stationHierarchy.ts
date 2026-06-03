/** PBS1 → PBS-01, ST12 → ST-12 for display */
export function formatStationDisplayCode(code: string): string {
  const c = code.trim().toUpperCase()
  const pbs = c.match(/^PBS(\d+)$/i)
  if (pbs) return `PBS-${pbs[1].padStart(2, '0')}`
  const st = c.match(/^ST(\d+)$/i)
  if (st) return `ST-${st[1].padStart(2, '0')}`
  return code
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
