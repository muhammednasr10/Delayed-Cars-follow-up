import {
  normalizeStationReferenceCode,
  composeStationNumber,
  workerIndexFromStationCode
} from '../../Utils/stationHierarchy'
import { createStation, deactivateStation, updateStation } from '../settingsService'
import { countWorkerLines, resolveMasterStationRecord } from '../../Utils/stationMaster'
import type { Station } from '../../Types/settings'
import type { ParentStationOperationsGroup } from '../../Types/timeStudy'
import { client } from './shared'

function resolveHeadcountTarget(master: Station, headcount?: number | null): number {
  if (headcount != null && Number.isFinite(headcount) && headcount >= 1) return Math.floor(headcount)
  if (master.headcount_workers != null && master.headcount_workers >= 1) return Math.floor(master.headcount_workers)
  return 1
}

async function countActiveOperations(stationId: string): Promise<number> {
  const { count, error } = await client()
    .from('station_operations')
    .select('*', { count: 'exact', head: true })
    .eq('station_id', stationId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function resolveMasterStationRow(masterOrWorker: Station): Promise<Station> {
  if (!/-L\d+$/i.test(masterOrWorker.station_number)) return masterOrWorker

  if (masterOrWorker.parent_station_id) {
    const { data, error } = await client()
      .from('stations')
      .select('*')
      .eq('id', masterOrWorker.parent_station_id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return data as Station
  }

  const base = normalizeStationReferenceCode(masterOrWorker.station_number)
  const { data, error } = await client().from('stations').select('*').eq('is_active', true)
  if (error) throw new Error(error.message)
  const found = (data ?? []).find(
    s =>
      normalizeStationReferenceCode(s.station_number) === base &&
      !/-L\d+$/i.test(s.station_number) &&
      !s.parent_station_id
  ) as Station | undefined
  return found ?? masterOrWorker
}

export async function syncWorkerLinesToHeadcount(
  masterOrWorker: Station,
  headcount?: number | null
): Promise<Station[]> {
  const master = await resolveMasterStationRow(masterOrWorker)
  const target = resolveHeadcountTarget(master, headcount)
  const base = normalizeStationReferenceCode(master.station_number)
  const linkParentId = /-L\d+$/i.test(master.station_number) ? null : master.id

  let children: Record<string, unknown>[] = []
  if (linkParentId) {
    const { data, error: childErr } = await client()
      .from('stations')
      .select('*')
      .eq('parent_station_id', linkParentId)
      .order('station_number')
    if (childErr) throw new Error(childErr.message)
    children = (data ?? []) as Record<string, unknown>[]
  }

  const { data: bySuffix, error: suffixErr } = await client()
    .from('stations')
    .select('*')
    .ilike('station_number', `${base}-L%`)
    .order('station_number')
  if (suffixErr) throw new Error(suffixErr.message)

  const workersByIndex = new Map<number, Station>()
  const register = (row: Record<string, unknown>) => {
    const st = row as Station
    const idx = workerIndexFromStationCode(st.station_number)
    if (idx == null) return
    const existing = workersByIndex.get(idx)
    if (
      !existing ||
      (linkParentId && st.parent_station_id === linkParentId && existing.parent_station_id !== linkParentId)
    ) {
      workersByIndex.set(idx, st)
    }
  }
  for (const row of children ?? []) register(row)
  for (const row of bySuffix ?? []) register(row)

  const ensured: Station[] = []
  for (let i = 1; i <= target; i++) {
    const workerNum = composeStationNumber(base, `L${i}`)
    let worker = workersByIndex.get(i)

    if (worker) {
      if (!worker.is_active) {
        worker = await updateStation(worker.id, {
          is_active: true,
          ...(linkParentId ? { parent_station_id: linkParentId } : {})
        })
      } else if (linkParentId && worker.parent_station_id !== linkParentId) {
        worker = await updateStation(worker.id, { parent_station_id: linkParentId })
      }
      workersByIndex.set(i, worker)
      ensured.push(worker)
      continue
    }

    const { data: existing, error: existErr } = await client()
      .from('stations')
      .select('*')
      .eq('station_number', workerNum)
      .maybeSingle()
    if (existErr) throw new Error(existErr.message)

    if (existing) {
      worker = existing.is_active
        ? ((linkParentId && existing.parent_station_id !== linkParentId
            ? await updateStation(existing.id as string, { parent_station_id: linkParentId })
            : existing) as Station)
        : await updateStation(existing.id as string, {
            is_active: true,
            ...(linkParentId ? { parent_station_id: linkParentId } : {})
          })
    } else {
      worker = await createStation({
        station_number: workerNum,
        station_name: master.station_name,
        parent_station_id: linkParentId,
        work_area_id: master.work_area_id ?? null,
        line_name: master.line_name ?? null,
        station_type: master.station_type ?? 'main_line',
        sort_order: (master.sort_order ?? 0) + i,
        is_active: master.is_active !== false
      })
    }

    workersByIndex.set(i, worker)
    ensured.push(worker)
  }

  const l1 = workersByIndex.get(1)
  if (l1) {
    const moveFromIds = new Set<string>()
    if (linkParentId) moveFromIds.add(linkParentId)
    if (masterOrWorker.id !== l1.id) moveFromIds.add(masterOrWorker.id)
    if (master.id !== l1.id && master.id !== masterOrWorker.id) moveFromIds.add(master.id)
    for (const fromId of moveFromIds) {
      const { error: moveErr } = await client()
        .from('station_operations')
        .update({ station_id: l1.id })
        .eq('station_id', fromId)
        .eq('is_active', true)
      if (moveErr) throw new Error(moveErr.message)
    }
  }

  for (const [idx, worker] of workersByIndex) {
    if (idx <= target || !worker.is_active) continue
    const opCount = await countActiveOperations(worker.id)
    if (opCount === 0) await deactivateStation(worker.id)
  }

  return ensured.sort(
    (a, b) => (workerIndexFromStationCode(a.station_number) ?? 0) - (workerIndexFromStationCode(b.station_number) ?? 0)
  )
}

export async function ensureFirstWorkerLine(master: Station): Promise<Station> {
  const lines = await syncWorkerLinesToHeadcount(master)
  return lines.find(l => workerIndexFromStationCode(l.station_number) === 1) ?? lines[0] ?? master
}

export async function syncAllWorkerHeadcountsFromGroups(
  parentGroups: ParentStationOperationsGroup[],
  allStations: Station[]
): Promise<boolean> {
  let changed = false
  for (const parent of parentGroups) {
    const target = parent.headcountWorkersOverride ?? parent.totalWorkers ?? 0
    if (target < 1 || countWorkerLines(parent) >= target) continue
    const master = resolveMasterStationRecord(parent, allStations)
    if (!master) continue
    await syncWorkerLinesToHeadcount(master, target)
    changed = true
  }
  return changed
}

export async function createParentStation(input: {
  stationNumber: string
  stationName: string
  workAreaId?: string | null
  headcountWorkers?: number | null
  avgStationTimeMinutes?: number | null
}): Promise<string> {
  const row = await createStation({
    station_number: input.stationNumber.trim(),
    station_name: input.stationName.trim(),
    station_type: 'pbs',
    work_area_id: input.workAreaId || null,
    headcount_workers: input.headcountWorkers ?? null,
    avg_station_time_minutes: input.avgStationTimeMinutes ?? null
  })
  return row.id
}

export async function createWorkerStation(input: {
  parentStationId: string
  workerCode: string
  workerName?: string
}): Promise<string> {
  const row = await createStation({
    station_number: input.workerCode.trim(),
    station_name: input.workerName?.trim() || input.workerCode.trim(),
    parent_station_id: input.parentStationId,
    station_type: 'pbs'
  })
  return row.id
}

export async function deactivateStationWithWorkers(parentStationId: string, workerStationIds: string[]): Promise<void> {
  for (const id of workerStationIds) await deactivateStation(id)
  await deactivateStation(parentStationId)
}
