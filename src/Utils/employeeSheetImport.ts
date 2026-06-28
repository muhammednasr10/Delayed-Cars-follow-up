import { parseSpreadsheetFile } from './parseSpreadsheet'
import type { AssignmentStatus } from '../Types/employee'
import type { EmployeeInput } from '../Types/employee'
import type { JobRole } from '../Types/enums'
import type { WorkArea } from '../Types/settings'

export type EmployeeImportPreviewRow = {
  rowNum: number
  employeeCode: string
  fullName: string
  jobRole: JobRole | null
  assignmentStatus: AssignmentStatus | null
  workAreaName: string | null
  workAreaId: string | null
  errors: string[]
}

const HEADER_ALIASES: Record<string, 'code' | 'name' | 'role' | 'assignment' | 'workplace'> = {
  'الرقم الوظيفي': 'code',
  'رقم وظيفي': 'code',
  employee_code: 'code',
  code: 'code',
  الاسم: 'name',
  name: 'name',
  full_name: 'name',
  الوظيفة: 'role',
  role: 'role',
  job_role: 'role',
  'حالة التعيين': 'assignment',
  assignment_status: 'assignment',
  assignment: 'assignment',
  'مكان العمل': 'workplace',
  workplace: 'workplace',
  work_area: 'workplace'
}

export function jobRoleFromSheetTitle(title: string): JobRole | null {
  const t = title.trim().replace(/\s+/g, ' ')
  const map: Record<string, JobRole> = {
    مشرف: 'supervisor',
    'مدخل بيانات': 'data_entry',
    'مدخل': 'data_entry',
    'مساعد مشرف': 'assistant_supervisor',
    'قائد مجموعة': 'leader',
    فني: 'technician',
    فنى: 'technician',
    Leader: 'leader',
    leader: 'leader'
  }
  return map[t] ?? null
}

function assignmentFromSheet(value: string): AssignmentStatus | null {
  const v = value.trim()
  if (!v) return null
  if (v === 'متعين') return 'متعين'
  if (v === 'كاجوال' || v.toLowerCase() === 'casual') return 'كاجوال'
  return null
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, ' ')
}

function mapHeaders(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(row)) {
    const field = HEADER_ALIASES[normalizeHeader(key)]
    if (field) out[field] = String(val ?? '').trim()
  }
  return out
}

export function buildEmployeeImportPreview(
  rows: Record<string, string>[],
  areas: WorkArea[],
  existingCodes: Set<string>
): EmployeeImportPreviewRow[] {
  const areaByName = new Map(areas.map(a => [a.name.trim(), a.id]))

  return rows.map((raw, i) => {
    const rowNum = i + 2
    const m = mapHeaders(raw)
    const errors: string[] = []
    const employeeCode = (m.code ?? '').trim()
    const fullName = (m.name ?? '').trim()
    const jobRole = m.role ? jobRoleFromSheetTitle(m.role) : null
    const assignmentStatus = m.assignment ? assignmentFromSheet(m.assignment) : null
    const workAreaName = (m.workplace ?? '').trim() || null

    if (!employeeCode) errors.push('MISSING_CODE')
    if (!fullName) errors.push('MISSING_NAME')
    if (!m.role) errors.push('MISSING_ROLE')
    else if (!jobRole) errors.push('UNKNOWN_ROLE')
    if (m.assignment && !assignmentStatus) errors.push('UNKNOWN_ASSIGNMENT')
    if (workAreaName && !areaByName.has(workAreaName)) errors.push('UNKNOWN_WORK_AREA')
    if (employeeCode && existingCodes.has(employeeCode.toLowerCase())) errors.push('DUPLICATE_CODE')

    return {
      rowNum,
      employeeCode,
      fullName,
      jobRole,
      assignmentStatus,
      workAreaName,
      workAreaId: workAreaName ? areaByName.get(workAreaName) ?? null : null,
      errors
    }
  })
}

export function previewRowToInput(row: EmployeeImportPreviewRow): EmployeeInput | null {
  if (row.errors.length > 0 || !row.jobRole || !row.employeeCode || !row.fullName) return null
  return {
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    jobRole: row.jobRole,
    department: null,
    workAreaId: row.workAreaId,
    stationId: null,
    lineName: null,
    factoryOrgUnitId: null,
    directManagerIds: [],
    phone: null,
    email: null,
    notes: null,
    assignmentStatus: row.assignmentStatus,
    isActive: true
  }
}

function sheetRowsToRecords(rows: string[][]): Record<string, string>[] {
  const nonEmpty = rows.filter(r => r.some(c => String(c).trim()))
  if (nonEmpty.length < 2) return []
  const headers = nonEmpty[0].map(h => String(h).replace(/^\uFEFF/, '').trim())
  return nonEmpty.slice(1).map(row => {
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => {
      if (h) rec[h] = String(row[i] ?? '').trim()
    })
    return rec
  })
}

/** CSV or XLSX from Google Sheets — upload the downloaded file directly (do not re-save from Excel). */
export async function parseEmployeeImportFile(
  file: File,
  areas: WorkArea[],
  existingCodes: Set<string>
): Promise<EmployeeImportPreviewRow[]> {
  const rows = await parseSpreadsheetFile(file)
  const records = sheetRowsToRecords(rows)
  if (records.length === 0) throw new Error('EMPTY_SHEET')
  return buildEmployeeImportPreview(records, areas, existingCodes)
}
