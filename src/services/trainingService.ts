import { supabase } from '../lib/supabase'
import { trainingLevelRank } from '../Types/enums'
import type { TrainingLevel } from '../Types/enums'
import type {
  EmployeeQualification,
  EmployeeTraining,
  EmployeeTrainingInput,
  SkillGap,
  StationRequiredSkill,
  StationRequiredSkillInput,
  TrainingSkill,
  TrainingSkillInput
} from '../Types/training'

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Check .env')
  return supabase
}

function dup(error: { code?: string; message?: string }): string {
  const msg = error.message || 'Request failed'
  if (error.code === '23505' || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) return 'DUPLICATE'
  return msg
}

// ---------------------------------------------------------------- Skills
type SkillRow = {
  id: string; skill_code: string; skill_name_ar: string | null; skill_name_en: string | null
  description: string | null; department: TrainingSkill['department']; station_id: string | null
  validity_days: number | null; is_mandatory: boolean; is_active: boolean
  standard_time_minutes: number | null; required_manpower_count: number | null; is_critical: boolean | null
}

function mapSkill(r: SkillRow): TrainingSkill {
  return {
    id: r.id, skillCode: r.skill_code, skillNameAr: r.skill_name_ar, skillNameEn: r.skill_name_en,
    description: r.description, department: r.department, stationId: r.station_id,
    validityDays: r.validity_days, isMandatory: r.is_mandatory, isActive: r.is_active,
    standardTimeMinutes: r.standard_time_minutes ?? null,
    requiredManpowerCount: r.required_manpower_count ?? 1,
    isCritical: r.is_critical ?? false
  }
}

export async function getSkills(): Promise<TrainingSkill[]> {
  const { data, error } = await client().from('training_skills').select('*').order('skill_code')
  if (error) throw new Error(error.message)
  return (data as SkillRow[]).map(mapSkill)
}

function skillPayload(input: TrainingSkillInput): Record<string, unknown> {
  return {
    skill_code: input.skillCode.trim(),
    skill_name_ar: input.skillNameAr?.trim() || null,
    skill_name_en: input.skillNameEn?.trim() || null,
    description: input.description?.trim() || null,
    department: input.department || null,
    station_id: input.stationId || null,
    validity_days: input.validityDays && input.validityDays > 0 ? input.validityDays : null,
    is_mandatory: input.isMandatory,
    is_active: input.isActive,
    standard_time_minutes: input.standardTimeMinutes && input.standardTimeMinutes >= 0 ? input.standardTimeMinutes : null,
    required_manpower_count: input.requiredManpowerCount > 0 ? input.requiredManpowerCount : 1,
    is_critical: input.isCritical
  }
}

export async function createSkill(input: TrainingSkillInput): Promise<void> {
  const { error } = await client().from('training_skills').insert(skillPayload(input))
  if (error) throw new Error(dup(error))
}

export async function updateSkill(id: string, input: TrainingSkillInput): Promise<void> {
  const { error } = await client().from('training_skills').update(skillPayload(input)).eq('id', id)
  if (error) throw new Error(dup(error))
}

export async function setSkillActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await client().from('training_skills').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ------------------------------------------------ Station required skills
type SrsRow = {
  id: string; station_id: string; skill_id: string; required_level: TrainingLevel
  is_mandatory: boolean; notes: string | null; is_active: boolean
  training_skills?: { skill_code: string; skill_name_ar: string | null; skill_name_en: string | null } | null
}

function mapSrs(r: SrsRow): StationRequiredSkill {
  const s = r.training_skills
  return {
    id: r.id, stationId: r.station_id, skillId: r.skill_id,
    skillCode: s?.skill_code ?? null,
    skillName: s ? (s.skill_name_ar || s.skill_name_en) : null,
    requiredLevel: r.required_level, isMandatory: r.is_mandatory, notes: r.notes, isActive: r.is_active
  }
}

export async function getStationRequiredSkills(stationId?: string): Promise<StationRequiredSkill[]> {
  let q = client()
    .from('station_required_skills')
    .select('*, training_skills(skill_code, skill_name_ar, skill_name_en)')
    .order('created_at')
  if (stationId) q = q.eq('station_id', stationId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data as SrsRow[]).map(mapSrs)
}

function srsPayload(input: StationRequiredSkillInput): Record<string, unknown> {
  return {
    station_id: input.stationId,
    skill_id: input.skillId,
    required_level: input.requiredLevel,
    is_mandatory: input.isMandatory,
    notes: input.notes?.trim() || null,
    is_active: input.isActive
  }
}

export async function createStationRequiredSkill(input: StationRequiredSkillInput): Promise<void> {
  const { error } = await client().from('station_required_skills').insert(srsPayload(input))
  if (error) throw new Error(dup(error))
}

export async function updateStationRequiredSkill(id: string, input: StationRequiredSkillInput): Promise<void> {
  const { error } = await client().from('station_required_skills').update(srsPayload(input)).eq('id', id)
  if (error) throw new Error(dup(error))
}

export async function deleteStationRequiredSkill(id: string): Promise<void> {
  const { error } = await client().from('station_required_skills').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ----------------------------------------------- Employee training records
type EtRow = {
  id: string; employee_id: string; employee_code: string; employee_name: string; job_role: string
  employee_department: EmployeeTraining['employeeDepartment']; work_area_id: string | null
  skill_id: string; skill_code: string; skill_name_ar: string | null; skill_name_en: string | null
  operation_station_id: string | null; operation_station_number: string | null; operation_station_name: string | null
  is_critical: boolean | null; required_manpower_count: number | null
  level: TrainingLevel; level_rank: number; rating: number | null; status: EmployeeTraining['status']
  effective_status: EmployeeTraining['effectiveStatus']; training_date: string | null; expiry_date: string | null
  last_evaluation_date: string | null
  is_expired: boolean; is_near_expiry: boolean; trainer_id: string | null; trainer_name: string | null
  notes: string | null; attachment_url: string | null
}

function mapEt(r: EtRow): EmployeeTraining {
  return {
    id: r.id, employeeId: r.employee_id, employeeCode: r.employee_code, employeeName: r.employee_name,
    jobRole: r.job_role, employeeDepartment: r.employee_department, workAreaId: r.work_area_id,
    skillId: r.skill_id, skillCode: r.skill_code, skillName: r.skill_name_ar || r.skill_name_en || r.skill_code,
    operationStationId: r.operation_station_id, operationStationNumber: r.operation_station_number, operationStationName: r.operation_station_name,
    isCritical: r.is_critical ?? false, requiredManpowerCount: r.required_manpower_count ?? 1,
    level: r.level, levelRank: r.level_rank, rating: r.rating ?? null, status: r.status, effectiveStatus: r.effective_status,
    trainingDate: r.training_date, expiryDate: r.expiry_date, lastEvaluationDate: r.last_evaluation_date,
    isExpired: r.is_expired, isNearExpiry: r.is_near_expiry,
    trainerId: r.trainer_id, trainerName: r.trainer_name, notes: r.notes, attachmentUrl: r.attachment_url
  }
}

export async function getEmployeeTrainings(): Promise<EmployeeTraining[]> {
  const { data, error } = await client().from('v_employee_training').select('*').order('employee_name')
  if (error) throw new Error(error.message)
  return (data as EtRow[]).map(mapEt)
}

function etPayload(input: EmployeeTrainingInput): Record<string, unknown> {
  return {
    employee_id: input.employeeId,
    skill_id: input.skillId,
    level: input.level,
    rating: input.rating && input.rating >= 1 && input.rating <= 5 ? input.rating : null,
    status: input.status,
    training_date: input.trainingDate || null,
    expiry_date: input.expiryDate || null,
    last_evaluation_date: input.lastEvaluationDate || null,
    trainer_id: input.trainerId || null,
    notes: input.notes?.trim() || null,
    attachment_url: input.attachmentUrl?.trim() || null,
    is_active: input.isActive
  }
}

export async function createTrainingRecord(input: EmployeeTrainingInput): Promise<void> {
  const { error } = await client().from('employee_training_records').insert(etPayload(input))
  if (error) throw new Error(dup(error))
}

export async function updateTrainingRecord(id: string, input: EmployeeTrainingInput): Promise<void> {
  const { error } = await client().from('employee_training_records').update(etPayload(input)).eq('id', id)
  if (error) throw new Error(dup(error))
}

export async function setTrainingRecordActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await client().from('employee_training_records').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

// --------------------------------------------------- Qualification compute
// Pure (RPC-ready) qualification calc for one station. Mandatory required
// skills must each have an effective 'qualified' record at >= required level.
export function computeStationQualifications(
  station: string,
  required: StationRequiredSkill[],
  trainings: EmployeeTraining[],
  employees: { id: string; employeeCode: string; fullName: string; jobRole: string; isActive: boolean }[]
): EmployeeQualification[] {
  const mandatory = required.filter(r => r.isActive && r.isMandatory && r.stationId === station)

  return employees
    .filter(e => e.isActive)
    .map(emp => {
      const empRecords = trainings.filter(t => t.employeeId === emp.id)
      const gaps: SkillGap[] = []

      for (const req of mandatory) {
        const rec = empRecords.find(t => t.skillId === req.skillId)
        if (!rec) {
          gaps.push({ skillId: req.skillId, skillName: req.skillName ?? req.skillCode ?? '', requiredLevel: req.requiredLevel, currentLevel: null, reason: 'not_trained' })
          continue
        }
        if (rec.effectiveStatus === 'suspended') {
          gaps.push({ skillId: req.skillId, skillName: rec.skillName, requiredLevel: req.requiredLevel, currentLevel: rec.level, reason: 'suspended' })
        } else if (rec.effectiveStatus === 'expired') {
          gaps.push({ skillId: req.skillId, skillName: rec.skillName, requiredLevel: req.requiredLevel, currentLevel: rec.level, reason: 'expired' })
        } else if (rec.effectiveStatus === 'in_training' || rec.effectiveStatus === 'not_trained') {
          gaps.push({ skillId: req.skillId, skillName: rec.skillName, requiredLevel: req.requiredLevel, currentLevel: rec.level, reason: rec.effectiveStatus === 'in_training' ? 'in_training' : 'not_trained' })
        } else if (rec.levelRank < trainingLevelRank(req.requiredLevel)) {
          gaps.push({ skillId: req.skillId, skillName: rec.skillName, requiredLevel: req.requiredLevel, currentLevel: rec.level, reason: 'level_too_low' })
        }
      }

      return {
        employeeId: emp.id, employeeCode: emp.employeeCode, employeeName: emp.fullName, jobRole: emp.jobRole,
        qualified: gaps.length === 0 && mandatory.length > 0,
        gaps
      }
    })
}
