import { supabase } from '../lib/supabase'
import type { ModelLine } from '../Utils/modelLines'
import { MODEL_LINES } from '../Utils/modelLines'

export type StationLineHeadcountMap = Map<string, Map<ModelLine, number>>

type Row = {
  station_id: string
  model_line: string
  headcount: number
}

function isModelLine(value: string): value is ModelLine {
  return (MODEL_LINES as readonly string[]).includes(value)
}

export async function listStationLineHeadcounts(): Promise<StationLineHeadcountMap> {
  const out: StationLineHeadcountMap = new Map()
  if (!supabase) return out
  const { data, error } = await supabase
    .from('station_line_headcounts')
    .select('station_id, model_line, headcount')
  if (error) {
    if (error.message.includes('station_line_headcounts')) return out
    throw new Error(error.message)
  }
  for (const row of (data ?? []) as Row[]) {
    if (!isModelLine(row.model_line)) continue
    const n = Number(row.headcount)
    if (!Number.isFinite(n) || n < 1) continue
    const byLine = out.get(row.station_id) ?? new Map<ModelLine, number>()
    byLine.set(row.model_line, Math.floor(n))
    out.set(row.station_id, byLine)
  }
  return out
}

export async function upsertStationLineHeadcount(
  stationId: string,
  modelLine: ModelLine,
  headcount: number
): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const n = Math.floor(headcount)
  if (n < 1) throw new Error('Invalid headcount')
  const { error } = await supabase.from('station_line_headcounts').upsert(
    { station_id: stationId, model_line: modelLine, headcount: n },
    { onConflict: 'station_id,model_line' }
  )
  if (error) throw new Error(error.message)
}

export function maxStoredHeadcount(byLine: Map<ModelLine, number> | undefined, extra?: number | null): number {
  const values = [...(byLine?.values() ?? [])]
  if (extra != null && extra > 0) values.push(extra)
  return values.length ? Math.max(...values) : 0
}

export function capForSelectedLines(
  byLine: Map<ModelLine, number> | undefined,
  lines: ModelLine[]
): number | null {
  if (!byLine || lines.length === 0) return null
  const values = lines.map(line => byLine.get(line)).filter((n): n is number => n != null && n > 0)
  return values.length ? Math.max(...values) : null
}

export type LineHeadcountEntry = { line: ModelLine; count: number }

export type StationHeadcountDisplay =
  | { mode: 'single'; count: number }
  | { mode: 'split'; entries: LineHeadcountEntry[] }

/** When several product lines are selected, show per-line counts if they are not the same. */
export function resolveStationHeadcountDisplay(
  byLine: Map<ModelLine, number> | undefined,
  selectedLines: ModelLine[],
  fallback: number
): StationHeadcountDisplay {
  const fallbackCount = fallback > 0 ? fallback : 0
  const lines = selectedLines.filter(Boolean)
  if (lines.length <= 1) {
    const only = lines[0]
    const stored = only ? byLine?.get(only) : undefined
    return { mode: 'single', count: stored != null && stored > 0 ? stored : fallbackCount }
  }

  const entries: LineHeadcountEntry[] = lines.map(line => {
    const stored = byLine?.get(line)
    return { line, count: stored != null && stored > 0 ? stored : fallbackCount }
  })
  const unique = new Set(entries.map(entry => entry.count))
  if (unique.size <= 1) {
    return { mode: 'single', count: entries[0]?.count ?? fallbackCount }
  }
  return { mode: 'split', entries }
}
