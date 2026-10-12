import { useEffect, useState } from 'react'
import { getAttendanceDaysForDate, localTodayIso } from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { getMissingParts } from '../services/missingPartsService'
import { getProductionPlanDayType } from '../services/productionPlanWorkDayDailyService'
import type { ProductionArea } from '../Types/navigation'
import {
  attendanceByProductionArea,
  openShortagesByProductionArea,
  type AreaAttendanceCount
} from '../Utils/productionAreaCounts'

export function useProductionAreaCounts(refreshKey = 0) {
  const [attendance, setAttendance] = useState<Record<ProductionArea, AreaAttendanceCount | null> | null>(null)
  const [openShortages, setOpenShortages] = useState<Record<ProductionArea, number | null> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const today = localTodayIso()
    setLoading(true)
    void Promise.all([
      getEmployees(),
      getFactoryOrgUnits({ includeInactive: true }),
      getAttendanceDaysForDate(today),
      getProductionPlanDayType(today),
      getMissingParts()
    ])
      .then(([employees, orgUnits, days, planDayType, parts]) => {
        if (cancelled) return
        setAttendance(
          attendanceByProductionArea(
            employees,
            orgUnits,
            days.map(record => ({
              employeeId: record.employeeId,
              workDate: record.workDate,
              status: record.status
            })),
            today,
            planDayType
          )
        )
        setOpenShortages(openShortagesByProductionArea(parts, orgUnits))
      })
      .catch(() => {
        if (!cancelled) {
          setAttendance(null)
          setOpenShortages(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { attendance, openShortages, loading }
}
