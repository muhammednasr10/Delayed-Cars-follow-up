import { supabase } from '../lib/supabase'
import { localTodayIso } from './attendanceService'
import {
  getEmployeeStationManpowerForDate,
  getModelScopeManpowerForStations,
  type EmployeeDailyStationAssignment
} from './stationManpowerDailyService'
import type { AttendanceDayStatus } from '../Types/attendance'
import type { VehicleModel } from '../Types/settings'
import type { ParentStationOperationsGroup, StationOperationDetail } from '../Types/timeStudy'
import { formatStationWorkerDisplayCode } from '../Utils/stationHierarchy'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type MyEmployeeProfile = {
  employeeId: string
  employeeCode: string
  fullName: string
  jobRole: string
  stationId: string | null
  stationNumber: string | null
  stationName: string | null
  lineName: string | null
  workAreaName: string | null
}

/** @deprecated use MyEmployeeProfile */
export type MyWorkerContext = MyEmployeeProfile & {
  workerLineStationId: string | null
  workerLineCode: string | null
  operations: StationOperationDetail[]
}

export type MyModelStationOperations = {
  modelId: string | null
  modelName: string
  stationId: string
  stationNumber: string
  stationName: string
  workerLineCode: string
  operations: StationOperationDetail[]
}

export type MyStationWorkContext = {
  allocationDate: string
  hasAllocation: boolean
  workerStationId: string | null
  workerLineCode: string | null
  stationNumber: string | null
  stationName: string | null
  byModel: MyModelStationOperations[]
}

export type MyTodayPunch = {
  workDate: string
  status: AttendanceDayStatus
  checkIn: string | null
  checkOut: string | null
}

async function resolveEmployeeId(): Promise<string | null> {
  const { data: userData } = await client().auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null
  const { data: profile, error } = await client().from('profiles').select('employee_id').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return (profile?.employee_id as string | undefined) ?? null
}

export async function fetchMyEmployeeProfile(): Promise<MyEmployeeProfile | null> {
  const employeeId = await resolveEmployeeId()
  if (!employeeId) return null

  const { data: emp, error: empErr } = await client()
    .from('employees')
    .select('employee_code, full_name, job_role, line_name, station_id, work_areas(name), stations(station_number, station_name)')
    .eq('id', employeeId)
    .maybeSingle()
  if (empErr) throw new Error(empErr.message)
  if (!emp) return null

  const area = emp.work_areas as { name?: string } | { name?: string }[] | null
  const workAreaName = Array.isArray(area) ? area[0]?.name ?? null : area?.name ?? null
  const st = emp.stations as { station_number?: string; station_name?: string } | null

  return {
    employeeId,
    employeeCode: String(emp.employee_code ?? ''),
    fullName: String(emp.full_name ?? ''),
    jobRole: String(emp.job_role ?? ''),
    stationId: emp.station_id as string | null,
    stationNumber: st?.station_number ?? null,
    stationName: st?.station_name ?? null,
    lineName: emp.line_name ? String(emp.line_name) : null,
    workAreaName
  }
}

function findWorkerInGroups(
  parentGroups: ParentStationOperationsGroup[],
  workerStationId: string
): ParentStationOperationsGroup['workers'][number] | null {
  for (const parent of parentGroups) {
    const worker = parent.workers.find(w => w.stationId === workerStationId)
    if (worker) return worker
  }
  return null
}

function operationAppliesToModel(op: StationOperationDetail, modelId: string | null, models: VehicleModel[]): boolean {
  if (!modelId) return true
  if (!op.parentModelId) return true
  if (op.parentModelId === modelId) return true
  const model = models.find(m => m.id === modelId)
  if (model?.parent_model_id && op.parentModelId === model.parent_model_id) return true
  return false
}

type EffectiveDailyAssignment = {
  modelId: string | null
  modelName: string
  stationId: string
  stationNumber: string
  stationName: string
}

function familyModels(models: VehicleModel[]): VehicleModel[] {
  return models.filter(m => m.is_active && m.model_kind === 'family')
}

function resolveEffectiveDailyAssignments(
  employeeId: string,
  myRows: EmployeeDailyStationAssignment[],
  modelOverrides: Awaited<ReturnType<typeof getModelScopeManpowerForStations>>,
  models: VehicleModel[]
): EffectiveDailyAssignment[] {
  const families = familyModels(models)
  const generalRows = myRows.filter(r => !r.vehicleModelId)
  const generalStationIds = [...new Set(generalRows.map(r => r.stationId))]
  const result: EffectiveDailyAssignment[] = []
  const seen = new Set<string>()

  function push(bucket: EffectiveDailyAssignment) {
    const key = `${bucket.modelId ?? '__general__'}:${bucket.stationId}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(bucket)
  }

  for (const model of families) {
    const explicit = myRows.filter(r => r.vehicleModelId === model.id)
    if (explicit.length > 0) {
      for (const row of explicit) {
        push({
          modelId: model.id,
          modelName: model.name,
          stationId: row.stationId,
          stationNumber: row.stationNumber,
          stationName: row.stationName
        })
      }
      continue
    }

    for (const row of generalRows) {
      const overrides = modelOverrides.filter(o => o.vehicleModelId === model.id && o.stationId === row.stationId)
      if (overrides.length > 0 && !overrides.some(o => o.employeeId === employeeId)) continue
      push({
        modelId: model.id,
        modelName: model.name,
        stationId: row.stationId,
        stationNumber: row.stationNumber,
        stationName: row.stationName
      })
    }
  }

  if (families.length === 0) {
    for (const row of myRows) {
      push({
        modelId: row.vehicleModelId,
        modelName: row.vehicleModelName || tFallbackModelName(models, row.vehicleModelId),
        stationId: row.stationId,
        stationNumber: row.stationNumber,
        stationName: row.stationName
      })
    }
    return result
  }

  if (generalRows.length > 0 && result.length === 0 && generalStationIds.length > 0) {
    for (const row of generalRows) {
      push({
        modelId: null,
        modelName: tFallbackModelName(models, null),
        stationId: row.stationId,
        stationNumber: row.stationNumber,
        stationName: row.stationName
      })
    }
  }

  return result
}

function buildModelOperations(
  parentGroups: ParentStationOperationsGroup[],
  models: VehicleModel[],
  assignments: EffectiveDailyAssignment[]
): MyModelStationOperations[] {
  const byModel: MyModelStationOperations[] = []

  for (const bucket of assignments) {
    const worker = findWorkerInGroups(parentGroups, bucket.stationId)
    const workerLineCode = worker
      ? formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
      : bucket.stationNumber
    const operations = (worker?.operations ?? []).filter(op => operationAppliesToModel(op, bucket.modelId, models))
    byModel.push({
      modelId: bucket.modelId,
      modelName: bucket.modelName,
      stationId: bucket.stationId,
      stationNumber: bucket.stationNumber,
      stationName: bucket.stationName,
      workerLineCode,
      operations
    })
  }

  byModel.sort((a, b) => a.modelName.localeCompare(b.modelName, 'ar'))
  return byModel
}

export async function fetchMyStationWork(
  parentGroups: ParentStationOperationsGroup[],
  models: VehicleModel[],
  workDate = localTodayIso()
): Promise<MyStationWorkContext | null> {
  const employeeId = await resolveEmployeeId()
  if (!employeeId) return null

  const myRows = await getEmployeeStationManpowerForDate(employeeId, workDate)

  if (myRows.length === 0) {
    return {
      allocationDate: workDate,
      hasAllocation: false,
      workerStationId: null,
      workerLineCode: null,
      stationNumber: null,
      stationName: null,
      byModel: []
    }
  }

  const generalStationIds = [...new Set(myRows.filter(r => !r.vehicleModelId).map(r => r.stationId))]
  const modelOverrides = await getModelScopeManpowerForStations(workDate, generalStationIds)
  const effective = resolveEffectiveDailyAssignments(employeeId, myRows, modelOverrides, models)
  const byModel = buildModelOperations(parentGroups, models, effective)

  const primary = myRows[0]
  const primaryWorker = findWorkerInGroups(parentGroups, primary.stationId)

  return {
    allocationDate: workDate,
    hasAllocation: true,
    workerStationId: primary.stationId,
    workerLineCode: primaryWorker
      ? formatStationWorkerDisplayCode(primaryWorker.displayCode || primaryWorker.stationNumber)
      : formatStationWorkerDisplayCode(primary.stationNumber),
    stationNumber: primary.stationNumber,
    stationName: primary.stationName,
    byModel
  }
}

function tFallbackModelName(models: VehicleModel[], modelId: string | null): string {
  if (!modelId) return 'عام'
  return models.find(m => m.id === modelId)?.name ?? modelId
}

/** للتوافق مع الشاشات القديمة */
export async function fetchMyWorkerContext(
  parentGroups: ParentStationOperationsGroup[]
): Promise<MyWorkerContext | null> {
  const profile = await fetchMyEmployeeProfile()
  if (!profile) return null
  let workerLineStationId: string | null = null
  let workerLineCode: string | null = null
  let operations: StationOperationDetail[] = []
  if (profile.stationId) {
    const worker = findWorkerInGroups(parentGroups, profile.stationId)
    if (worker) {
      workerLineStationId = worker.stationId
      workerLineCode = worker.displayCode || worker.stationNumber
      operations = worker.operations
    }
  }
  return { ...profile, workerLineStationId, workerLineCode, operations }
}

export async function getMyTodayPunch(): Promise<MyTodayPunch | null> {
  const employeeId = await resolveEmployeeId()
  if (!employeeId) return null

  const today = localTodayIso()
  const { data, error } = await client()
    .from('employee_attendance_days')
    .select('work_date, status, check_in, check_out')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) {
    return { workDate: today, status: 'present', checkIn: null, checkOut: null }
  }
  return {
    workDate: data.work_date as string,
    status: data.status as AttendanceDayStatus,
    checkIn: data.check_in ? String(data.check_in).slice(0, 5) : null,
    checkOut: data.check_out ? String(data.check_out).slice(0, 5) : null
  }
}

export async function punchMyAttendance(action: 'in' | 'out'): Promise<MyTodayPunch> {
  const { data, error } = await client().rpc('punch_my_attendance', { p_action: action })
  if (error) {
    if (error.message.includes('NO_LINKED_EMPLOYEE')) throw new Error('NO_LINKED_EMPLOYEE')
    throw new Error(error.message)
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Punch failed')
  return {
    workDate: String(row.work_date),
    status: row.status as AttendanceDayStatus,
    checkIn: row.check_in ? String(row.check_in).slice(0, 5) : null,
    checkOut: row.check_out ? String(row.check_out).slice(0, 5) : null
  }
}
