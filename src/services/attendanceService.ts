import { supabase } from '../lib/supabase'
import {
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT,
  type AttendanceDay,
  type AttendanceDayEdit,
  type AttendanceDayInput,
  type AttendanceDayStatus,
  type AttendanceIssueLeader,
  type EmployeeAttendanceSummary
} from '../Types/attendance'
import type { JobRole } from '../Types/enums'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

/** Local calendar date (YYYY-MM-DD) for attendance cutoffs */
export function localTodayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Count in summaries only after the calendar day has ended */
export function isAttendanceDayElapsed(workDate: string, today = localTodayIso()): boolean {
  return workDate < today
}

/** Persist today and past; future days stay UI defaults only */
export function isAttendanceDayPersistable(workDate: string, today = localTodayIso()): boolean {
  return workDate <= today
}

function listDatesInMonth(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate()
  const dates: string[] = []
  for (let day = 1; day <= last; day++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return dates
}

export function tallyElapsedMonthDays(
  employeeIds: string[],
  year: number,
  month: number,
  dayRecords: { employeeId: string; workDate: string; status: AttendanceDayStatus }[],
  today = localTodayIso()
): Map<string, { present: number; absent: number; vacation: number; sick: number }> {
  const monthDates = listDatesInMonth(year, month).filter(d => d <= today)
  const byEmpDate = new Map<string, Map<string, AttendanceDayStatus>>()
  for (const r of dayRecords) {
    if (r.workDate > today) continue
    let m = byEmpDate.get(r.employeeId)
    if (!m) {
      m = new Map()
      byEmpDate.set(r.employeeId, m)
    }
    m.set(r.workDate, r.status)
  }

  const tallies = new Map<string, { present: number; absent: number; vacation: number; sick: number }>()
  for (const employeeId of employeeIds) {
    const byDate = byEmpDate.get(employeeId)
    const t = { present: 0, absent: 0, vacation: 0, sick: 0 }
    for (const workDate of monthDates) {
      const recorded = byDate?.get(workDate)
      if (workDate === today) {
        if (!recorded) continue
        if (recorded === 'present') t.present++
        else if (recorded === 'absent') t.absent++
        else if (recorded === 'vacation') t.vacation++
        else if (recorded === 'sick') t.sick++
        continue
      }
      const st = recorded ?? 'present'
      if (st === 'present') t.present++
      else if (st === 'absent') t.absent++
      else if (st === 'vacation') t.vacation++
      else if (st === 'sick') t.sick++
    }
    tallies.set(employeeId, t)
  }
  return tallies
}

type DayRow = {
  id: string
  employee_id: string
  work_date: string
  status: AttendanceDayStatus
  check_in: string | null
  check_out: string | null
  notes: string | null
}

function mapDay(row: DayRow): AttendanceDay {
  return {
    id: row.id,
    employeeId: row.employee_id,
    workDate: row.work_date,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes
  }
}

function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null
  return t.length >= 5 ? t.slice(0, 5) : t
}

export function buildMonthDayEdits(year: number, month: number, existing: AttendanceDay[]): AttendanceDayEdit[] {
  const byDate = new Map(existing.map(d => [d.workDate, d]))
  const last = new Date(year, month, 0).getDate()
  const rows: AttendanceDayEdit[] = []
  for (let day = 1; day <= last; day++) {
    const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const ex = byDate.get(workDate)
    const status = ex?.status ?? 'present'
    rows.push({
      workDate,
      status,
      checkIn: status === 'present' ? normalizeTime(ex?.checkIn) ?? DEFAULT_ATTENDANCE_CHECK_IN : '',
      checkOut: status === 'present' ? normalizeTime(ex?.checkOut) ?? DEFAULT_ATTENDANCE_CHECK_OUT : '',
      notes: ex?.notes ?? ''
    })
  }
  return rows
}

export function dayEditToInput(employeeId: string, row: AttendanceDayEdit): AttendanceDayInput {
  const present = row.status === 'present'
  return {
    employeeId,
    workDate: row.workDate,
    status: row.status,
    checkIn: present ? normalizeTime(row.checkIn) ?? DEFAULT_ATTENDANCE_CHECK_IN : null,
    checkOut: present ? normalizeTime(row.checkOut) ?? DEFAULT_ATTENDANCE_CHECK_OUT : null,
    notes: row.notes.trim() || null
  }
}

function toPayload(input: AttendanceDayInput): Record<string, unknown> {
  const present = input.status === 'present'
  return {
    employee_id: input.employeeId,
    work_date: input.workDate,
    status: input.status,
    check_in: present ? normalizeTime(input.checkIn) ?? DEFAULT_ATTENDANCE_CHECK_IN : null,
    check_out: present ? normalizeTime(input.checkOut) ?? DEFAULT_ATTENDANCE_CHECK_OUT : null,
    notes: input.notes?.trim() || null
  }
}

export async function getEmployeeAttendanceMonth(
  employeeId: string,
  year: number,
  month: number
): Promise<AttendanceDayEdit[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('employee_attendance_days')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')
  if (error) throw new Error(error.message)
  const days = (data ?? []).map(r => mapDay(r as DayRow))
  return buildMonthDayEdits(year, month, days)
}

export async function getAttendanceDaysForMonth(year: number, month: number): Promise<AttendanceDay[]> {
  const { start, end } = monthBounds(year, month)
  const { data, error } = await requireClient()
    .from('employee_attendance_days')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapDay(r as DayRow))
}

export async function getAttendanceDaysForDate(workDate: string): Promise<AttendanceDay[]> {
  const { data, error } = await requireClient()
    .from('employee_attendance_days')
    .select('*')
    .eq('work_date', workDate)
    .order('employee_id')

  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapDay(r as DayRow))
}

export async function upsertAttendanceDay(input: AttendanceDayInput): Promise<void> {
  const { error } = await requireClient()
    .from('employee_attendance_days')
    .upsert(toPayload(input), { onConflict: 'employee_id,work_date' })
  if (error) throw new Error(error.message)
}

export async function pruneFutureAttendanceDays(employeeId: string, year: number, month: number): Promise<void> {
  const today = localTodayIso()
  const { start, end } = monthBounds(year, month)
  const { error } = await requireClient()
    .from('employee_attendance_days')
    .delete()
    .eq('employee_id', employeeId)
    .gt('work_date', today)
    .gte('work_date', start)
    .lte('work_date', end)
  if (error) throw new Error(error.message)
}

export async function bulkUpsertAttendanceDays(inputs: AttendanceDayInput[]): Promise<void> {
  const persistable = inputs.filter(i => isAttendanceDayPersistable(i.workDate))
  if (persistable.length === 0) return
  const batchSize = 100
  for (let i = 0; i < persistable.length; i += batchSize) {
    const batch = persistable.slice(i, i + batchSize).map(toPayload)
    const { error } = await requireClient()
      .from('employee_attendance_days')
      .upsert(batch, { onConflict: 'employee_id,work_date' })
    if (error) throw new Error(error.message)
  }
}

type EmpRow = { id: string; employee_code: string; full_name: string; job_role: JobRole; is_active: boolean }

export async function getMonthlyAttendanceSummaries(
  year: number,
  month: number,
  activeOnly = true
): Promise<EmployeeAttendanceSummary[]> {
  const { start, end } = monthBounds(year, month)
  const client = requireClient()

  let empQuery = client.from('employees').select('id, employee_code, full_name, job_role, is_active').order('employee_code')
  if (activeOnly) empQuery = empQuery.eq('is_active', true)
  const { data: emps, error: empErr } = await empQuery
  if (empErr) throw new Error(empErr.message)

  const { data: days, error: dayErr } = await client
    .from('employee_attendance_days')
    .select('employee_id, work_date, status')
    .gte('work_date', start)
    .lte('work_date', end)
  if (dayErr) throw new Error(dayErr.message)

  const empRows = (emps ?? []) as EmpRow[]
  const dayRecords = (days ?? []).map(d => ({
    employeeId: d.employee_id as string,
    workDate: d.work_date as string,
    status: d.status as AttendanceDayStatus
  }))
  const tallies = tallyElapsedMonthDays(
    empRows.map(e => e.id),
    year,
    month,
    dayRecords
  )

  return empRows.map(e => {
    const t = tallies.get(e.id) ?? { present: 0, absent: 0, vacation: 0, sick: 0 }
    const issueDays = t.absent + t.vacation + t.sick
    return {
      employeeId: e.id,
      employeeCode: e.employee_code,
      fullName: e.full_name,
      jobRole: e.job_role,
      presentDays: t.present,
      absentDays: t.absent,
      vacationDays: t.vacation,
      sickDays: t.sick,
      issueDays
    }
  })
}

export async function getTopAttendanceIssues(
  year: number,
  month: number,
  limit = 10
): Promise<AttendanceIssueLeader[]> {
  const summaries = await getMonthlyAttendanceSummaries(year, month, true)
  return summaries
    .filter(s => s.issueDays > 0)
    .map(s => ({
      ...s,
      rankScore: s.absentDays * 3 + s.vacationDays * 2 + s.sickDays * 2
    }))
    .sort((a, b) => b.rankScore - a.rankScore || b.issueDays - a.issueDays)
    .slice(0, limit)
}
