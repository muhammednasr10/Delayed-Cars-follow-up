import { useEffect, useState } from 'react'
import { profileIsAdmin, useAuth } from '../Context/AuthContext'
import {
  computeDailyAttendanceEfficiency,
  countPresentToday,
  getAttendanceDaysForDate,
  localTodayIso
} from '../services/attendanceService'
import { getEmployees } from '../services/employeesService'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { filterAssemblyWorkforce } from '../Utils/assemblyWorkforce'
import { filterAssemblyWorkforceForViewer } from '../Utils/assemblySupervisorScope'

export function useTodayAttendanceEfficiency(refreshKey = 0) {
  const { profile, hasRole } = useAuth()
  const viewerEmployeeId = profile?.employee_id ?? null
  const seesAll = profileIsAdmin(profile) || hasRole('admin', 'production')
  const [efficiency, setEfficiency] = useState<number | null>(null)
  const [presentTodayCount, setPresentTodayCount] = useState(0)
  const [workforceCount, setWorkforceCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const today = localTodayIso()
    const d = new Date()
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    setLoading(true)
    void Promise.all([getEmployees(), getFactoryOrgUnits({ includeInactive: true }), getAttendanceDaysForDate(today)])
      .then(([employees, orgUnits, days]) => {
        if (cancelled) return
        const assemblyEmployees = filterAssemblyWorkforceForViewer(
          filterAssemblyWorkforce(employees, orgUnits).filter(e => e.isActive),
          viewerEmployeeId,
          seesAll
        )
        const activeIds = assemblyEmployees.map(e => e.id)
        const activeIdSet = new Set(activeIds)
        const assemblyDays = days.filter(d => activeIdSet.has(d.employeeId))
        const dayRecords = assemblyDays.map(record => ({
          employeeId: record.employeeId,
          workDate: record.workDate,
          status: record.status
        }))
        const effMap = computeDailyAttendanceEfficiency(activeIds, year, month, dayRecords, today)
        setEfficiency(effMap.get(today) ?? null)
        setPresentTodayCount(countPresentToday(activeIds, dayRecords, today))
        setWorkforceCount(activeIds.length)
      })
      .catch(() => {
        if (!cancelled) {
          setEfficiency(null)
          setPresentTodayCount(0)
          setWorkforceCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, viewerEmployeeId, seesAll])

  return { efficiency, presentTodayCount, workforceCount, loading }
}
