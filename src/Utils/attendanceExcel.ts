import * as XLSX from 'xlsx'
import { parseSpreadsheetFile } from './parseSpreadsheet'
import type { AttendanceDayInput, AttendanceDayStatus } from '../Types/attendance'
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_CHECK_IN,
  DEFAULT_ATTENDANCE_CHECK_OUT
} from '../Types/attendance'
import { dayEditToInput } from '../services/attendanceService'
import type { Employee } from '../Types/employee'

const STATUS_MAP: Record<string, AttendanceDayStatus> = {
  present: 'present',
  حاضر: 'present',
  ح: 'present',
  p: 'present',
  absent: 'absent',
  غياب: 'absent',
  غائب: 'absent',
  غ: 'absent',
  a: 'absent',
  vacation: 'vacation',
  اجازة: 'vacation',
  إجازة: 'vacation',
  اجازه: 'vacation',
  v: 'vacation',
  sick: 'sick',
  مرض: 'sick',
  مرضى: 'sick',
  م: 'sick',
  s: 'sick',
  permission: 'permission',
  اذن: 'permission',
  إذن: 'permission',
  late: 'late',
  تأخير: 'late',
  تاخير: 'late'
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, ' ').toLowerCase()
}

const COL: Record<string, keyof ParsedCols> = {
  'الرقم الوظيفي': 'code',
  'رقم وظيفي': 'code',
  employee_code: 'code',
  code: 'code',
  الاسم: 'name',
  name: 'name',
  التاريخ: 'date',
  date: 'date',
  work_date: 'date',
  الحالة: 'status',
  status: 'status',
  'وقت الحضور': 'checkIn',
  check_in: 'checkIn',
  'حضور': 'checkIn',
  'وقت الانصراف': 'checkOut',
  check_out: 'checkOut',
  'انصراف': 'checkOut',
  ملاحظات: 'notes',
  notes: 'notes'
}

type ParsedCols = {
  code?: string
  name?: string
  date?: string
  status?: string
  checkIn?: string
  checkOut?: string
  notes?: string
}

function parseStatus(raw: string): AttendanceDayStatus | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '')
  return STATUS_MAP[key] ?? STATUS_MAP[raw.trim()] ?? null
}

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const n = Number(s)
  if (!Number.isNaN(n) && n > 40000) {
    const date = new Date((n - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  return null
}

export type AttendanceImportRow = {
  rowNum: number
  input: AttendanceDayInput | null
  errors: string[]
}

export async function parseAttendanceImportFile(
  file: File,
  employees: Employee[]
): Promise<AttendanceImportRow[]> {
  const rows = await parseSpreadsheetFile(file)
  if (rows.length < 2) return []

  const headers = rows[0].map(h => normalizeHeader(String(h)))
  const colIndex: Partial<Record<keyof ParsedCols, number>> = {}
  headers.forEach((h, i) => {
    const field = COL[h] ?? COL[h.replace(/[^\w\u0600-\u06FF]/g, '')]
    if (field) colIndex[field] = i
  })

  const byCode = new Map(employees.map(e => [e.employeeCode.trim().toLowerCase(), e.id]))

  return rows.slice(1).map((row, idx) => {
    const rowNum = idx + 2
    const get = (k: keyof ParsedCols) => {
      const i = colIndex[k]
      return i == null ? '' : String(row[i] ?? '').trim()
    }
    const code = get('code')
    const dateRaw = get('date')
    const statusRaw = get('status')
    const errors: string[] = []

    const employeeId = code ? byCode.get(code.toLowerCase()) : undefined
    if (!code) errors.push('MISSING_CODE')
    else if (!employeeId) errors.push('UNKNOWN_EMPLOYEE')

    const workDate = dateRaw ? parseDate(dateRaw) : null
    if (!dateRaw) errors.push('MISSING_DATE')
    else if (!workDate) errors.push('BAD_DATE')

    const status = statusRaw ? parseStatus(statusRaw) : null
    if (!statusRaw) errors.push('MISSING_STATUS')
    else if (!status) errors.push('BAD_STATUS')

    if (errors.length > 0 || !employeeId || !workDate || !status) {
      return { rowNum, input: null, errors }
    }

    const edit = {
      workDate,
      status,
      checkIn: get('checkIn'),
      checkOut: get('checkOut'),
      notes: get('notes')
    }
    return {
      rowNum,
      input: dayEditToInput(employeeId, edit),
      errors: []
    }
  })
}

export function exportAttendanceMonthExcel(
  year: number,
  month: number,
  days: { employeeCode: string; fullName: string; workDate: string; status: AttendanceDayStatus; checkIn: string | null; checkOut: string | null; notes: string | null }[],
  summaries: { employeeCode: string; fullName: string; absentDays: number; vacationDays: number; sickDays: number; presentDays: number; issueDays: number }[]
): void {
  const detailHeaders = ['الرقم الوظيفي', 'الاسم', 'التاريخ', 'الحالة', 'وقت الحضور', 'وقت الانصراف', 'ملاحظات']
  const detailRows = days.map(d => [
    d.employeeCode,
    d.fullName,
    d.workDate,
    d.status,
    d.checkIn ?? '',
    d.checkOut ?? '',
    d.notes ?? ''
  ])

  const sumHeaders = ['الرقم الوظيفي', 'الاسم', 'حاضر', 'غياب', 'إجازة', 'مرضى', 'إجمالي الغياب']
  const sumRows = summaries
    .filter(s => s.issueDays > 0 || s.presentDays > 0)
    .map(s => [
      s.employeeCode,
      s.fullName,
      s.presentDays,
      s.absentDays,
      s.vacationDays,
      s.sickDays,
      s.issueDays
    ])

  const wb = XLSX.utils.book_new()
  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
  const wsSum = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows])
  XLSX.utils.book_append_sheet(wb, wsDetail, 'تفاصيل_يومية')
  XLSX.utils.book_append_sheet(wb, wsSum, `ملخص_${year}_${month}`)
  XLSX.writeFile(wb, `attendance_${year}_${String(month).padStart(2, '0')}.xlsx`)
}

export function exportAttendanceYearExcel(
  year: number,
  days: { employeeCode: string; fullName: string; workDate: string; status: AttendanceDayStatus; checkIn: string | null; checkOut: string | null; notes: string | null }[],
  summaries: { employeeCode: string; fullName: string; absentDays: number; vacationDays: number; sickDays: number; presentDays: number; issueDays: number }[]
): void {
  const detailHeaders = ['الرقم الوظيفي', 'الاسم', 'التاريخ', 'الحالة', 'وقت الحضور', 'وقت الانصراف', 'ملاحظات']
  const detailRows = days.map(d => [
    d.employeeCode,
    d.fullName,
    d.workDate,
    d.status,
    d.checkIn ?? '',
    d.checkOut ?? '',
    d.notes ?? ''
  ])

  const sumHeaders = ['الرقم الوظيفي', 'الاسم', 'حاضر', 'غياب', 'إجازة', 'مرضى', 'إجمالي الغياب']
  const sumRows = summaries
    .filter(s => s.issueDays > 0 || s.presentDays > 0)
    .map(s => [
      s.employeeCode,
      s.fullName,
      s.presentDays,
      s.absentDays,
      s.vacationDays,
      s.sickDays,
      s.issueDays
    ])

  const wb = XLSX.utils.book_new()
  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
  const wsSum = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows])
  XLSX.utils.book_append_sheet(wb, wsDetail, 'تفاصيل_يومية')
  XLSX.utils.book_append_sheet(wb, wsSum, `ملخص_${year}`)
  XLSX.writeFile(wb, `attendance_${year}.xlsx`)
}

export function attendanceStatusLabel(status: AttendanceDayStatus, t: (k: string) => string): string {
  return t(`attendance.status.${status}`)
}

export { ATTENDANCE_STATUSES }
