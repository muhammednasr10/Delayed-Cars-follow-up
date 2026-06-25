import { supabase } from '../lib/supabase'
import { trainingLevelRank } from '../Types/enums'
import type { TrainingLevel } from '../Types/enums'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export type OperationTrainingSummary = {
  operationId: string
  operationCode: string
  operationNameAr: string
  stationNumber: string
  stationName: string
  skillId: string | null
  requiredLevel: TrainingLevel
  qualifiedCount: number
  inTrainingCount: number
  notQualifiedCount: number
  standardTimeSeconds: number | null
}

type OpRow = {
  id: string
  operation_code: string
  operation_name_ar: string
  standard_time_seconds: number | null
  required_level: TrainingLevel
  stations: { station_number: string; station_name: string } | null
  training_skills: { id: string }[] | null
}

type EtRow = {
  skill_id: string
  level: TrainingLevel
  level_rank: number
  effective_status: string
}

export async function listOperationTrainingSummaries(
  stationId?: string
): Promise<OperationTrainingSummary[]> {
  let q = client()
    .from('station_operations')
    .select(
      'id, operation_code, operation_name_ar, standard_time_seconds, required_level, stations(station_number, station_name), training_skills(id)'
    )
    .eq('is_active', true)
    .order('operation_name_ar')

  if (stationId) q = q.eq('station_id', stationId)

  const { data: ops, error } = await q
  if (error) throw new Error(error.message)

  const { data: trainings, error: trErr } = await client()
    .from('v_employee_training')
    .select('skill_id, level, level_rank, effective_status')
    .eq('is_active', true)
  if (trErr) throw new Error(trErr.message)

  const bySkill = new Map<string, EtRow[]>()
  for (const t of trainings ?? []) {
    const list = bySkill.get(t.skill_id) ?? []
    list.push(t as EtRow)
    bySkill.set(t.skill_id, list)
  }

  const { data: reqs } = await client()
    .from('operation_required_skills')
    .select('operation_id, skill_id, required_level')
    .eq('is_active', true)

  const reqByOp = new Map<string, { skillId: string; requiredLevel: TrainingLevel }>()
  for (const r of reqs ?? []) {
    reqByOp.set(r.operation_id, {
      skillId: r.skill_id,
      requiredLevel: r.required_level as TrainingLevel
    })
  }

  return (ops as unknown as OpRow[]).map(op => {
    const skills = op.training_skills
    const skillId = Array.isArray(skills) ? skills[0]?.id : (skills as { id: string } | null)?.id
    const req = reqByOp.get(op.id)
    const sid = skillId ?? req?.skillId ?? null
    const requiredLevel = (req?.requiredLevel ?? op.required_level ?? 'level_3') as TrainingLevel
    const reqRank = trainingLevelRank(requiredLevel)

    let qualifiedCount = 0
    let inTrainingCount = 0
    let notQualifiedCount = 0

    if (sid) {
      for (const rec of bySkill.get(sid) ?? []) {
        if (rec.effective_status === 'qualified' && rec.level_rank >= reqRank) qualifiedCount++
        else if (rec.effective_status === 'in_training') inTrainingCount++
        else notQualifiedCount++
      }
    }

    const st = op.stations as unknown as { station_number: string; station_name: string } | null

    return {
      operationId: op.id,
      operationCode: op.operation_code,
      operationNameAr: op.operation_name_ar,
      stationNumber: st?.station_number ?? '',
      stationName: st?.station_name ?? '',
      skillId: sid,
      requiredLevel,
      qualifiedCount,
      inTrainingCount,
      notQualifiedCount,
      standardTimeSeconds: op.standard_time_seconds != null ? Number(op.standard_time_seconds) : null
    }
  })
}
