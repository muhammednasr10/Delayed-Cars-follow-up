export type StationManpowerDailyRow = {
  id: string
  workDate: string
  stationId: string
  employeeId: string
  vehicleModelId?: string | null
  notes?: string | null
}

export type StationManpowerHistoryEntry = {
  id: string
  workDate: string
  stationNumber: string
  stationName: string
  employeeCode: string
  employeeName: string
  notes?: string | null
}

export type StationManpowerDayEdit = {
  stationId: string
  stationNumber: string
  stationName: string
  /** اسم شائع لعمليات هذا العامل لهذا الموديل/اليوم */
  operationsSummary: string
  employeeIds: string[]
}
