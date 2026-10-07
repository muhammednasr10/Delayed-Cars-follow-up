import type { MissionIplPart, MissionPerson, TeamMission, TeamMissionInput } from '../Types/mission'

type AssigneeRow = {
  employee_id: string
  employees?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
}

export type MissionDbRow = {
  id: string
  title: string
  description: string | null
  assignee_id: string
  status: TeamMission['status']
  priority: TeamMission['priority']
  due_date: string | null
  recurrence_type?: TeamMission['recurrenceType']
  recurrence_custom?: string | null
  recurrence_series_id?: string | null
  completed_at: string | null
  notes: string | null
  created_by_employee_id?: string | null
  created_by_name?: string | null
  source_vehicle_id?: string | null
  source_missing_part_id?: string | null
  source_scratch_id?: string | null
  source_vin?: string | null
  source_model_name?: string | null
  parent_model_id?: string | null
  variant_model_id?: string | null
  vehicle_count?: number | null
  chassis_numbers?: string[] | null
  ipl_parts?: unknown
  created_at: string
  updated_at: string
  assignee?: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null
  team_mission_assignees?: AssigneeRow[] | null
  team_mission_responses?: { count: number }[] | null
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function relCount(value: { count?: number }[] | null | undefined): number {
  if (!value?.length) return 0
  const n = Number(value[0]?.count ?? 0)
  return Number.isFinite(n) ? n : 0
}

function mapAssignees(rows: AssigneeRow[] | null | undefined): MissionPerson[] {
  if (!rows?.length) return []
  return rows.map(row => {
    const employee = relOne(row.employees)
    return {
      id: row.employee_id,
      name: employee?.full_name ?? '—',
      code: employee?.employee_code ?? '—'
    }
  })
}

export function mapIplParts(value: unknown): MissionIplPart[] {
  if (!Array.isArray(value)) return []
  const out: MissionIplPart[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const partId = String(row.partId ?? row.part_id ?? '')
    const partNumber = String(row.partNumber ?? row.part_number ?? '')
    if (!partId || !partNumber) continue
    const name = row.partName ?? row.part_name
    out.push({ partId, partNumber, partName: typeof name === 'string' && name.trim() ? name : null })
  }
  return out
}

export function mapMissionRow(row: MissionDbRow): TeamMission {
  const assignees = mapAssignees(row.team_mission_assignees)
  const primary = assignees[0]
  const employee = relOne(row.assignee)
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: primary?.id ?? row.assignee_id,
    assigneeName: primary?.name ?? employee?.full_name ?? '—',
    assigneeCode: primary?.code ?? employee?.employee_code ?? '—',
    assigneeIds: assignees.length > 0 ? assignees.map(person => person.id) : [row.assignee_id],
    assignees:
      assignees.length > 0
        ? assignees
        : [{ id: row.assignee_id, name: employee?.full_name ?? '—', code: employee?.employee_code ?? '—' }],
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    recurrenceType: row.recurrence_type ?? 'none',
    recurrenceCustom: row.recurrence_custom ?? null,
    recurrenceSeriesId: row.recurrence_series_id ?? row.id,
    completedAt: row.completed_at,
    notes: row.notes,
    responseCount: relCount(row.team_mission_responses),
    createdByEmployeeId: row.created_by_employee_id ?? null,
    createdByName: row.created_by_name ?? null,
    sourceVehicleId: row.source_vehicle_id ?? null,
    sourceMissingPartId: row.source_missing_part_id ?? null,
    sourceScratchId: row.source_scratch_id ?? null,
    sourceVin: row.source_vin ?? null,
    sourceModelName: row.source_model_name ?? null,
    parentModelId: row.parent_model_id ?? null,
    parentModelName: null,
    variantModelId: row.variant_model_id ?? null,
    variantModelName: null,
    vehicleCount: row.vehicle_count ?? null,
    chassisNumbers: Array.isArray(row.chassis_numbers) ? row.chassis_numbers.filter(Boolean) : [],
    iplParts: mapIplParts(row.ipl_parts),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function missionWriteError(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('parent_model_id') || text.includes('variant_model_id')) return 'MISSION_MODELS_SCHEMA'
  if (text.includes('vehicle_count') || text.includes('chassis_numbers')) return 'MISSION_CHASSIS_SCHEMA'
  if (text.includes('ipl_parts')) return 'MISSION_PARTS_SCHEMA'
  return message
}

export function toMissionPayload(input: TeamMissionInput) {
  const firstId = input.assigneeIds[0]
  if (!firstId) throw new Error('ASSIGNEES_REQUIRED')
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    assignee_id: firstId,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate || null,
    recurrence_type: input.recurrenceType ?? 'none',
    recurrence_custom: input.recurrenceCustom?.trim() || null,
    notes: input.notes?.trim() || null
  }
  if (input.parentModelId !== undefined || input.variantModelId !== undefined) {
    payload.parent_model_id = input.parentModelId || null
    payload.variant_model_id = input.parentModelId ? input.variantModelId || null : null
  }
  if (input.vehicleCount !== undefined || input.chassisNumbers !== undefined) {
    const vins = (input.chassisNumbers ?? []).map(vin => vin.trim()).filter(Boolean)
    payload.vehicle_count = vins.length > 0 ? vins.length : null
    payload.chassis_numbers = vins
  }
  if (input.iplParts !== undefined) {
    payload.ipl_parts = input.iplParts.map(part => ({
      partId: part.partId,
      partNumber: part.partNumber,
      partName: part.partName
    }))
  }
  if (input.sourceVehicleId !== undefined || input.sourceScratchId !== undefined) {
    payload.source_vehicle_id = input.sourceVehicleId || null
    payload.source_missing_part_id = input.sourceMissingPartId || null
    payload.source_scratch_id = input.sourceScratchId || null
    payload.source_vin = input.sourceVin?.trim() || null
    payload.source_model_name = input.sourceModelName?.trim() || null
  }
  return payload
}
