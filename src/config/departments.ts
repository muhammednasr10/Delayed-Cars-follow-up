import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, CalendarRange, Compass, Factory, Users, Warehouse, Wrench } from 'lucide-react'
import type { DepartmentId } from '../Types/navigation'

export type DepartmentConfig = {
  id: DepartmentId
  icon: LucideIcon
  accent: string
}

export const DEPARTMENTS: DepartmentConfig[] = [
  { id: 'production', icon: Factory, accent: 'cyan' },
  { id: 'warehouses', icon: Warehouse, accent: 'amber' },
  { id: 'planning', icon: CalendarRange, accent: 'violet' },
  { id: 'engineering', icon: Compass, accent: 'orange' },
  { id: 'maintenance', icon: Wrench, accent: 'slate' },
  { id: 'quality', icon: BadgeCheck, accent: 'emerald' },
  { id: 'hr', icon: Users, accent: 'blue' }
]

export function departmentAccentClass(accent: string, active: boolean): string {
  if (!active) return 'bg-slate-800 text-slate-300 hover:bg-slate-700'
  const map: Record<string, string> = {
    cyan: 'bg-cyan-500 text-slate-950',
    amber: 'bg-amber-500 text-slate-950',
    violet: 'bg-violet-500 text-slate-950',
    orange: 'bg-orange-500 text-slate-950',
    slate: 'bg-slate-500 text-slate-950',
    emerald: 'bg-emerald-500 text-slate-950',
    blue: 'bg-blue-500 text-slate-950'
  }
  return map[accent] ?? 'bg-cyan-500 text-slate-950'
}
