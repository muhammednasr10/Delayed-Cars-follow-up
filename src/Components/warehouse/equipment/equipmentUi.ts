import type { LucideIcon } from 'lucide-react'
import type { WarehouseEquipmentStatus } from '../../../Types/warehouse'

export const EQUIPMENT_STATUSES: WarehouseEquipmentStatus[] = ['active', 'maintenance', 'retired']

export const equipmentTh = 'px-3 py-2 text-start text-[10px] font-bold uppercase text-slate-400'
export const equipmentTd = 'px-3 py-2 text-sm text-slate-300'

export function parseOptionalNumber(value: string): number | null {
  return value ? Number(value) : null
}

export type EquipmentSectionHeaderProps = {
  icon: LucideIcon
  toneClass: string
  title: string
  hint: string
  canManage: boolean
  onRefresh: () => void
  onAdd: () => void
  search: string
  onSearch: (value: string) => void
  refreshLabel: string
  addLabel: string
  searchPlaceholder: string
}
