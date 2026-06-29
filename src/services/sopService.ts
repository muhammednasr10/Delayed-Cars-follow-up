import { supabase } from '../lib/supabase'
import type { SopFamilyBundle, SopOperationInstruction, SopWorkerInstruction } from '../Types/sop'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getSopForFamily(modelFamilyId: string): Promise<SopFamilyBundle> {
  const [workersRes, opsRes] = await Promise.all([
    client()
      .from('sop_worker_instructions')
      .select('worker_station_id, model_family_id, station_instructions')
      .eq('model_family_id', modelFamilyId),
    client().from('sop_operation_instructions').select('operation_id, instructions')
  ])

  if (workersRes.error) throw new Error(workersRes.error.message)
  if (opsRes.error) throw new Error(opsRes.error.message)

  const workers: SopWorkerInstruction[] = (workersRes.data ?? []).map(row => ({
    workerStationId: row.worker_station_id as string,
    modelFamilyId: row.model_family_id as string,
    stationInstructions: (row.station_instructions as string) ?? ''
  }))

  const operations: SopOperationInstruction[] = (opsRes.data ?? []).map(row => ({
    operationId: row.operation_id as string,
    instructions: (row.instructions as string) ?? ''
  }))

  return { workers, operations }
}

export async function upsertWorkerSop(
  workerStationId: string,
  modelFamilyId: string,
  stationInstructions: string
): Promise<void> {
  const { error } = await client()
    .from('sop_worker_instructions')
    .upsert(
      {
        worker_station_id: workerStationId,
        model_family_id: modelFamilyId,
        station_instructions: stationInstructions.trim()
      },
      { onConflict: 'worker_station_id,model_family_id' }
    )
  if (error) throw new Error(error.message)
}

export async function upsertOperationSop(operationId: string, instructions: string): Promise<void> {
  const { error } = await client()
    .from('sop_operation_instructions')
    .upsert({ operation_id: operationId, instructions: instructions.trim() }, { onConflict: 'operation_id' })
  if (error) throw new Error(error.message)
}
