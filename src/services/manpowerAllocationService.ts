import { supabase } from '../lib/supabase'
import { trainingLevelRank } from '../Types/enums'
import type { TrainingLevel } from '../Types/enums'
import type {
  AllocationShift,
  ManpowerAllocationDay,
  ManpowerAllocationLine,
  ManpowerWarningCode
} from '../Types/manpower'
import { getModelRouting } from './routingService'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

type LineRow = ManpowerAllocationLine

function mapLine(r: LineRow): ManpowerAllocationLine {
  return {
    ...r,
    warnings: r.warnings ?? [],
    standard_time_seconds: r.standard_time_seconds != null ? Number(r.standard_time_seconds) : null
  }
}

export async function getOrCreateAllocationDay(
  allocationDate: string,
  shift: AllocationShift,
  vehicleModelId: string | null
): Promise<ManpowerAllocationDay> {
  let q = client()
    .from('manpower_allocation_days')
    .select('*, vehicle_models(name)')
    .eq('allocation_date', allocationDate)
    .eq('shift', shift)

  if (vehicleModelId) q = q.eq('vehicle_model_id', vehicleModelId)
  else q = q.is('vehicle_model_id', null)

  const { data: existing, error: findErr } = await q.maybeSingle()
  if (findErr) throw new Error(findErr.message)

  if (existing) {
    return {
      id: existing.id,
      allocation_date: existing.allocation_date,
      shift: existing.shift,
      vehicle_model_id: existing.vehicle_model_id,
      notes: existing.notes,
      status: existing.status,
      vehicle_model_name: (existing.vehicle_models as { name: string } | null)?.name
    }
  }

  const { data: created, error } = await client()
    .from('manpower_allocation_days')
    .insert({
      allocation_date: allocationDate,
      shift,
      vehicle_model_id: vehicleModelId
    })
    .select('*, vehicle_models(name)')
    .single()
  if (error) throw new Error(error.message)

  return {
    id: created.id,
    allocation_date: created.allocation_date,
    shift: created.shift,
    vehicle_model_id: created.vehicle_model_id,
    notes: created.notes,
    status: created.status,
    vehicle_model_name: (created.vehicle_models as { name: string } | null)?.name
  }
}

export async function getAllocationLines(dayId: string): Promise<ManpowerAllocationLine[]> {
  const { data, error } = await client()
    .from('v_manpower_allocation_lines')
    .select('*')
    .eq('day_id', dayId)
    .order('station_number')
    .order('operation_name_ar')
    .order('slot_no')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => mapLine(r as LineRow))
}

export async function clearAllocationLines(dayId: string): Promise<void> {
  const { error } = await client().from('manpower_allocation_lines').delete().eq('day_id', dayId)
  if (error) throw new Error(error.message)
}

export async function seedAllocationFromRouting(
  dayId: string,
  vehicleModelId: string,
  options?: { replace?: boolean }
): Promise<number> {
  const routes = await getModelRouting(vehicleModelId)
  if (routes.length === 0) return 0

  const { data: existing } = await client()
    .from('manpower_allocation_lines')
    .select('id')
    .eq('day_id', dayId)
    .limit(1)

  if (existing && existing.length > 0) {
    if (options?.replace) await clearAllocationLines(dayId)
    else throw new Error('DAY_HAS_LINES')
  }

  const rows: Record<string, unknown>[] = []
  for (const r of routes) {
    const req = Math.max(1, r.required_manpower_count)
    for (let slot = 1; slot <= req; slot++) {
      rows.push({
        day_id: dayId,
        operation_id: r.operation_id,
        station_id: r.station_id,
        slot_no: slot,
        required_manpower: req,
        standard_time_seconds: r.standard_time_seconds
      })
    }
  }

  const { error } = await client().from('manpower_allocation_lines').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}

type SkillReq = { skillId: string; requiredLevel: TrainingLevel }

async function getOperationSkillReq(operationId: string): Promise<SkillReq | null> {
  const { data: skill, error } = await client()
    .from('training_skills')
    .select('id, station_operation_id')
    .eq('station_operation_id', operationId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!skill) return null

  const { data: req } = await client()
    .from('operation_required_skills')
    .select('required_level')
    .eq('operation_id', operationId)
    .eq('skill_id', skill.id)
    .eq('is_active', true)
    .maybeSingle()

  const { data: op } = await client()
    .from('station_operations')
    .select('required_level')
    .eq('id', operationId)
    .maybeSingle()

  return {
    skillId: skill.id,
    requiredLevel: (req?.required_level ?? op?.required_level ?? 'level_3') as TrainingLevel
  }
}

async function getAttendanceStatus(employeeId: string, workDate: string): Promise<string | null> {
  const { data } = await client()
    .from('employee_attendance_days')
    .select('status')
    .eq('employee_id', employeeId)
    .eq('work_date', workDate)
    .maybeSingle()
  return data?.status ?? null
}

async function getTrainingRecord(employeeId: string, skillId: string) {
  const { data } = await client()
    .from('v_employee_training')
    .select('level, level_rank, effective_status, is_expired, rating')
    .eq('employee_id', employeeId)
    .eq('skill_id', skillId)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export async function evaluateAssignmentWarnings(
  operationId: string,
  employeeId: string,
  allocationDate: string
): Promise<ManpowerWarningCode[]> {
  const warnings: ManpowerWarningCode[] = []
  const att = await getAttendanceStatus(employeeId, allocationDate)
  if (att !== 'present') warnings.push('absent')

  const req = await getOperationSkillReq(operationId)
  if (!req) return warnings

  const rec = await getTrainingRecord(employeeId, req.skillId)
  if (!rec) {
    warnings.push('not_qualified')
    return warnings
  }
  if (rec.is_expired || rec.effective_status === 'expired') warnings.push('training_expired')
  else if (rec.effective_status === 'in_training') warnings.push('in_training')
  else if (rec.effective_status !== 'qualified') warnings.push('not_qualified')
  else if ((rec.level_rank as number) < trainingLevelRank(req.requiredLevel)) warnings.push('level_too_low')

  return warnings
}

export async function assignEmployeeToLine(
  lineId: string,
  employeeId: string | null,
  options?: { overrideReason?: string; allocationDate?: string; operationId?: string }
): Promise<void> {
  let operationId = options?.operationId
  let allocationDate = options?.allocationDate

  if (!operationId || !allocationDate) {
    const { data: line, error: lineErr } = await client()
      .from('v_manpower_allocation_lines')
      .select('operation_id, allocation_date')
      .eq('id', lineId)
      .maybeSingle()
    if (lineErr) throw new Error(lineErr.message)
    if (!line) throw new Error('Line not found')
    operationId = line.operation_id
    allocationDate = line.allocation_date
  }

  let warnings: string[] = []
  let isOverride = false
  let overrideReason: string | null = null

  if (employeeId && operationId && allocationDate) {
    const codes = await evaluateAssignmentWarnings(operationId, employeeId, allocationDate)
    warnings = codes
    if (codes.length > 0) {
      if (!options?.overrideReason?.trim()) {
        throw new Error(`WARNINGS:${codes.join(',')}`)
      }
      isOverride = true
      overrideReason = options.overrideReason.trim()
    }
  }

  const { error } = await client()
    .from('manpower_allocation_lines')
    .update({
      assigned_employee_id: employeeId,
      warnings,
      is_override: isOverride,
      override_reason: overrideReason,
      override_by: isOverride ? undefined : null
    })
    .eq('id', lineId)
  if (error) throw new Error(error.message)
}

export async function getUnderstaffedOperations(dayId: string): Promise<string[]> {
  const lines = await getAllocationLines(dayId)
  const byOp = new Map<string, { required: number; assigned: number }>()
  for (const l of lines) {
    const cur = byOp.get(l.operation_id) ?? { required: l.required_manpower, assigned: 0 }
    if (l.assigned_employee_id) cur.assigned++
    byOp.set(l.operation_id, cur)
  }
  return [...byOp.entries()]
    .filter(([, v]) => v.assigned < v.required)
    .map(([opId]) => opId)
}

export async function listActiveEmployees(): Promise<
  { id: string; employee_code: string; full_name: string }[]
> {
  const { data, error } = await client()
    .from('employees')
    .select('id, employee_code, full_name')
    .eq('is_active', true)
    .order('full_name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getQualifiedEmployeesForOperation(
  operationId: string,
  allocationDate: string
): Promise<
  { id: string; employee_code: string; full_name: string; warnings: ManpowerWarningCode[]; rating: number | null }[]
> {
  const req = await getOperationSkillReq(operationId)
  const employees = await listActiveEmployees()
  const results: {
    id: string
    employee_code: string
    full_name: string
    warnings: ManpowerWarningCode[]
    rating: number | null
  }[] = []

  for (const e of employees) {
    const warnings = await evaluateAssignmentWarnings(operationId, e.id, allocationDate)
    let rating: number | null = null
    if (req) {
      const rec = await getTrainingRecord(e.id, req.skillId)
      rating = rec?.rating ?? null
    }
    results.push({ ...e, warnings, rating })
  }

  return results.sort((a, b) => {
    if (a.warnings.length !== b.warnings.length) return a.warnings.length - b.warnings.length
    return (b.rating ?? 0) - (a.rating ?? 0)
  })
}
