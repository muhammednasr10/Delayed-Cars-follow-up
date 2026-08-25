const STORAGE_KEY = 'mp-report-group-primary-v1'

function readMap(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Remember which shortage wording the user picked as the group main row. */
export function rememberReportGroupPrimary(reportGroupId: string, primaryIssueKey: string): void {
  if (!reportGroupId || !primaryIssueKey) return
  try {
    const map = readMap()
    map[reportGroupId] = primaryIssueKey
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota / private mode */
  }
}

export function rememberedPrimaryForGroup(reportGroupId: string | null | undefined): string | null {
  if (!reportGroupId) return null
  return readMap()[reportGroupId] ?? null
}
