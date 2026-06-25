import type { MissingPartDetail, MissingPartFilters } from '../Types/missingPart'

export const ACTIVE_COLS = ['select', 'vin', 'model', 'color', 'station', 'qty', 'reason', 'reasonClass', 'department', 'dateTime', 'actions'] as const
export const HISTORY_COLS = ['vin', 'model', 'color', 'station', 'qty', 'reason', 'reasonClass', 'department', 'dateTime', 'resolvedAt'] as const

export const cell = 'table-cell-compact whitespace-nowrap text-center align-middle'
export const actionsCell = `${cell} sticky z-10 bg-slate-900/95 shadow-[inset_8px_0_12px_rgba(0,0,0,0.3)]`
export const iconSize = 'h-[18px] w-[18px]'

export function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function applyFilters(items: MissingPartDetail[], filters: MissingPartFilters) {
  const base = items
    .filter(i => !filters.stationNumber || i.stationNumber === filters.stationNumber)
    .filter(i => !filters.modelName || i.modelName === filters.modelName)
    .filter(i => !filters.department || i.department === filters.department)

  const q = filters.search.trim().toLowerCase()
  if (!q) return base

  const matchingGroups = new Set<string>()
  for (const i of base) {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q) && i.reportGroupId) {
      matchingGroups.add(i.reportGroupId)
    }
  }

  return base.filter(i => {
    if ([i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q)) return true
    return Boolean(i.reportGroupId && matchingGroups.has(i.reportGroupId))
  })
}

export function canCompleteVehicle(vehicleId: string, parts: MissingPartDetail[]): boolean {
  const lines = parts.filter(p => p.vehicleId === vehicleId)
  return lines.some(p => !p.shortageResolvedAt && p.status !== 'closed' && p.status !== 'cancelled')
}

export function isFirstVehicleRow(list: MissingPartDetail[], index: number, vehicleId: string): boolean {
  return list.findIndex(x => x.vehicleId === vehicleId) === index
}

export function formatDateTime(iso: string, lang: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
  return {
    date: d.toLocaleDateString(locale),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }
}
