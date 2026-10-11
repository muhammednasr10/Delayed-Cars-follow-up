import type { ProductionPlanWorkDayEdit } from '../Types/productionPlanWorkDayDaily'
import { defaultPlannedHoursForDayType, isVacationOrFactoryHoliday } from './productionPlanWorkDayDaily'

/** يطبّق تعديل خلية على صف يوم العمل، ويظبط الساعات مع نوع اليوم. */
export function applyWorkDayPatch(
  row: ProductionPlanWorkDayEdit,
  patch: Partial<ProductionPlanWorkDayEdit>
): ProductionPlanWorkDayEdit {
  const updated = { ...row, ...patch }
  if (patch.dayType && patch.plannedHours === undefined) {
    updated.plannedHours = defaultPlannedHoursForDayType(patch.dayType)
    if (isVacationOrFactoryHoliday(patch.dayType)) {
      updated.workDespiteVacation = false
      updated.actualHours = 0
    } else {
      updated.workDespiteVacation = false
      if (patch.actualHours === undefined) updated.actualHours = updated.plannedHours
    }
  } else if (
    patch.plannedHours !== undefined &&
    patch.actualHours === undefined &&
    !isVacationOrFactoryHoliday(updated.dayType) &&
    (row.actualHours === 0 || row.actualHours === row.plannedHours)
  ) {
    updated.actualHours = patch.plannedHours
  }
  if (patch.workDespiteVacation === false) updated.actualHours = 0
  return updated
}
