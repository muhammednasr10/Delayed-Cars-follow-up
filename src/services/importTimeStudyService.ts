import { supabase } from '../lib/supabase'
import { operationCodeFor } from '../Utils/timeStudyParser'
import type { ParseResult } from '../Types/timeStudy'
import { getTiggo8FamilyId, getFamilyMembers } from './modelFamiliesService'
import { getVehicleModels } from './settingsService'
import { createDraftTimeStudyFromImport } from './timeStudyService'

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

type StationRow = { id: string; station_number: string }
type OpRow = { id: string; station_id: string; operation_code: string; operation_name_ar: string }

export type ImportSummary = {
  batchId: string
  stationsCreated: number
  stationsUpdated: number
  operationsCreated: number
  operationsUpdated: number
  hardwareRows: number
  routesCreated: number
  skillsLinked: number
  timeStudiesDrafted: number
  errors: string[]
}

async function loadExistingStations(): Promise<Map<string, StationRow>> {
  const { data } = await client().from('stations').select('id, station_number')
  const m = new Map<string, StationRow>()
  ;(data ?? []).forEach(r => m.set(String(r.station_number).toUpperCase(), r as StationRow))
  return m
}

async function loadExistingOps(): Promise<Map<string, OpRow>> {
  const { data } = await client().from('station_operations').select('id, station_id, operation_code, operation_name_ar')
  const m = new Map<string, OpRow>()
  ;(data ?? []).forEach(r => m.set(`${r.station_id}::${r.operation_name_ar}`, r as OpRow))
  return m
}

function inferStationType(code: string): string {
  if (/^PBS/i.test(code)) return 'pbs'
  if (/^ST/i.test(code)) return 'main_line'
  return 'other'
}

export async function buildImportDiff(parse: ParseResult): Promise<{ label: string; action: string; key: string }[]> {
  const existingSt = await loadExistingStations()
  const diffs: { label: string; action: string; key: string }[] = []
  for (const s of parse.stations) {
    const ex = existingSt.get(s.code)
    diffs.push({
      key: s.code,
      action: ex ? 'update' : 'create',
      label: ex ? `Update station ${s.code}` : `Create station ${s.code}`
    })
  }
  const existingOps = await loadExistingOps()
  for (const op of parse.operations) {
    const st = existingSt.get(op.stationCode)
    const key = st ? `${st.id}::${op.operationNameAr}` : `${op.stationCode}::${op.operationNameAr}`
    const ex = st ? existingOps.get(key) : undefined
    diffs.push({
      key,
      action: ex ? 'update' : 'create',
      label: ex ? `Update op ${op.operationNameAr} @ ${op.stationCode}` : `Create op ${op.operationNameAr} @ ${op.stationCode}`
    })
  }
  return diffs
}

export async function runTimeStudyImport(
  parse: ParseResult,
  options: { mode: 'merge' | 'replace_hardware'; tiggo8ModelIds: string[] }
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    batchId: '',
    stationsCreated: 0,
    stationsUpdated: 0,
    operationsCreated: 0,
    operationsUpdated: 0,
    hardwareRows: 0,
    routesCreated: 0,
    skillsLinked: 0,
    timeStudiesDrafted: 0,
    errors: []
  }

  const { data: batch, error: batchErr } = await client()
    .from('import_batches')
    .insert({ source_type: 'csv', row_count: parse.operations.length, status: 'running' })
    .select('id')
    .single()
  if (batchErr) throw new Error(batchErr.message)
  summary.batchId = batch.id

  const tiggo8Id = await getTiggo8FamilyId()
  const familyModelIds = options.tiggo8ModelIds.length > 0 ? options.tiggo8ModelIds : (tiggo8Id ? await getFamilyMembers(tiggo8Id) : [])
  const allModels = await getVehicleModels()
  const modelByName = new Map(allModels.map(m => [m.name.toLowerCase(), m.id]))

  let stationMap = await loadExistingStations()
  const parentIds = new Map<string, string>()

  for (const s of parse.stations.sort((a, b) => (a.isGroupHeader ? -1 : 1) - (b.isGroupHeader ? -1 : 1))) {
    const payload = {
      station_number: s.code,
      station_name: s.name,
      station_type: s.stationType || inferStationType(s.code),
      line_name: s.lineName,
      sort_order: s.sortOrder,
      is_active: true,
      parent_station_id: s.parentCode ? parentIds.get(s.parentCode) ?? null : null
    }
    const ex = stationMap.get(s.code)
    if (ex) {
      await client().from('stations').update(payload).eq('id', ex.id)
      summary.stationsUpdated++
      parentIds.set(s.code, ex.id)
    } else {
      const { data, error } = await client().from('stations').insert(payload).select('id, station_number').single()
      if (error) { summary.errors.push(`Station ${s.code}: ${error.message}`); continue }
      stationMap.set(s.code, data as StationRow)
      parentIds.set(s.code, data.id)
      summary.stationsCreated++
    }
  }

  stationMap = await loadExistingStations()
  let existingOps = await loadExistingOps()

  for (const op of parse.operations) {
    const st = stationMap.get(op.stationCode)
    if (!st) { summary.errors.push(`Missing station ${op.stationCode} for ${op.operationNameAr}`); continue }

    const isCommon = op.operationType === 'common'
    const opPayload = {
      station_id: st.id,
      operation_code: operationCodeFor(op.stationCode, op.sequenceNo, op.operationNameAr),
      operation_name_ar: op.operationNameAr,
      operation_type: op.operationType,
      model_family_id: isCommon ? tiggo8Id : null,
      technician_position: op.technicianPosition,
      tool_spec: op.toolSpec,
      tool_spec_percent: op.toolSpecPercent,
      standard_time_seconds: op.standardTimeSeconds,
      standard_time_minutes: op.standardTimeMinutes,
      worker_time_minutes: op.workerTimeMinutes,
      station_time_minutes: op.stationTimeMinutes,
      required_manpower_count: op.requiredManpowerCount ?? 1,
      task_precedence: op.taskPrecedence,
      ranked_positional_weight: op.rankedPositionalWeight,
      zoning_constraints: op.zoningConstraints,
      sequence_no: op.sequenceNo,
      is_active: true,
      import_batch_id: batch.id,
      source_row_number: op.rowNumbers[0] ?? null
    }

    const opKey = `${st.id}::${op.operationNameAr}`
    let operationId: string
    const ex = existingOps.get(opKey)
    if (ex) {
      await client().from('station_operations').update(opPayload).eq('id', ex.id)
      operationId = ex.id
      summary.operationsUpdated++
    } else {
      const { data, error } = await client().from('station_operations').insert(opPayload).select('id').single()
      if (error) { summary.errors.push(`Op ${op.operationNameAr}: ${error.message}`); continue }
      operationId = data.id
      existingOps.set(opKey, { id: operationId, station_id: st.id, operation_code: opPayload.operation_code, operation_name_ar: op.operationNameAr })
      summary.operationsCreated++
    }

    if (options.mode === 'replace_hardware') {
      await client().from('operation_hardware_requirements').delete().eq('operation_id', operationId)
    }
    if (op.hardware.length > 0) {
      const { error: hwErr } = await client().from('operation_hardware_requirements').insert(
        op.hardware.map((h, i) => ({
          operation_id: operationId,
          hardware_name: h.hardwareName,
          hardware_qty: h.hardwareQty,
          hardware_type: h.hardwareType,
          hardware_size: h.hardwareSize,
          sort_order: i
        }))
      )
      if (!hwErr) summary.hardwareRows += op.hardware.length
    }

    await client().from('operation_time_studies').delete().eq('operation_id', operationId)
    await client().from('operation_time_studies').insert({
      operation_id: operationId,
      station_id: st.id,
      standard_time_seconds: op.standardTimeSeconds,
      operation_time_minutes: op.standardTimeMinutes,
      worker_time_minutes: op.workerTimeMinutes,
      station_time_minutes: op.stationTimeMinutes,
      total_workers_at_station: op.requiredManpowerCount,
      average_station_time_per_worker: op.averageStationTimePerWorker,
      ranked_positional_weight: op.rankedPositionalWeight,
      zoning_constraints: op.zoningConstraints,
      task_precedence: op.taskPrecedence,
      source_row_number: op.rowNumbers[0] ?? null
    })

    if (isCommon && tiggo8Id) {
      for (const modelId of familyModelIds) {
        const { error: rErr } = await client().from('vehicle_model_operations').upsert({
          vehicle_model_id: modelId,
          model_family_id: null,
          station_id: st.id,
          operation_id: operationId,
          sequence_no: op.sequenceNo,
          operation_type: 'common',
          standard_time_seconds: op.standardTimeSeconds,
          is_required: true,
          is_active: true
        }, { onConflict: 'vehicle_model_id,operation_id', ignoreDuplicates: true })
        if (!rErr) summary.routesCreated++
      }
      if (familyModelIds.length === 0) {
        await client().from('vehicle_model_operations').upsert({
          vehicle_model_id: null,
          model_family_id: tiggo8Id,
          station_id: st.id,
          operation_id: operationId,
          sequence_no: op.sequenceNo,
          operation_type: 'common',
          is_required: true,
          is_active: true
        }, { onConflict: 'model_family_id,operation_id', ignoreDuplicates: true })
        summary.routesCreated++
      }
    } else if (op.vehicleModelName) {
      const modelId = modelByName.get(op.vehicleModelName.toLowerCase()) ?? modelByName.get(op.operationType.toLowerCase())
      if (modelId) {
        await client().from('vehicle_model_operations').upsert({
          vehicle_model_id: modelId,
          station_id: st.id,
          operation_id: operationId,
          sequence_no: op.sequenceNo,
          operation_type: op.operationType,
          is_required: true,
          is_active: true
        }, { onConflict: 'vehicle_model_id,operation_id', ignoreDuplicates: true })
        summary.routesCreated++
      }
    }

    const skillCode = opPayload.operation_code
    const { data: skillEx } = await client().from('training_skills').select('id').eq('station_operation_id', operationId).maybeSingle()
    if (!skillEx) {
      const { error: skErr } = await client().from('training_skills').insert({
        skill_code: skillCode,
        skill_name_ar: op.operationNameAr,
        station_id: st.id,
        station_operation_id: operationId,
        standard_time_minutes: op.standardTimeMinutes,
        required_manpower_count: op.requiredManpowerCount ?? 1,
        is_active: true
      })
      if (!skErr) summary.skillsLinked++
    }

    if (op.standardTimeSeconds && op.standardTimeSeconds > 0) {
      try {
        let modelIdForStudy: string | null = null
        if (!isCommon && op.vehicleModelName) {
          modelIdForStudy = modelByName.get(op.vehicleModelName.toLowerCase()) ?? null
        } else if (!isCommon && op.operationType) {
          modelIdForStudy = modelByName.get(op.operationType.toLowerCase()) ?? null
        }
        const studyId = await createDraftTimeStudyFromImport({
          operationId,
          stationId: st.id,
          vehicleModelId: modelIdForStudy,
          observedSeconds: op.standardTimeSeconds,
          importBatchId: batch.id
        })
        if (studyId) summary.timeStudiesDrafted++
      } catch (e) {
        summary.errors.push(
          `Time study draft ${op.operationNameAr}: ${e instanceof Error ? e.message : 'error'}`
        )
      }
    }
  }

  await client().from('import_batches').update({ status: 'completed', summary }).eq('id', batch.id)
  return summary
}
