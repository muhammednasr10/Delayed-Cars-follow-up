import { useCallback, useState } from 'react'
import { DEFAULT_KANBAN_SCENARIO, type KanbanScenario } from '../Types/kanbanFeeding'

const STORAGE_KEY = 'warehouse_feeding_scenario_v2'
const LEGACY_STORAGE_KEY = 'warehouse_feeding_scenario_v1'

function pickScenarioFields(raw: Record<string, unknown>): KanbanScenario {
  return {
    lotSize: Number(raw.lotSize) || DEFAULT_KANBAN_SCENARIO.lotSize,
    safetyFactor: Number(raw.safetyFactor) || DEFAULT_KANBAN_SCENARIO.safetyFactor,
    warehouseLeadTimeMin: Number(raw.warehouseLeadTimeMin) || DEFAULT_KANBAN_SCENARIO.warehouseLeadTimeMin
  }
}

function loadScenario(): KanbanScenario {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_KANBAN_SCENARIO }
    return pickScenarioFields(JSON.parse(raw) as Record<string, unknown>)
  } catch {
    return { ...DEFAULT_KANBAN_SCENARIO }
  }
}

function persistScenario(scenario: KanbanScenario) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario))
  } catch {
    /* ignore quota */
  }
}

export function useFeedingScenarioSettings() {
  const [scenario, setScenarioState] = useState<KanbanScenario>(loadScenario)

  const setScenario = useCallback((next: KanbanScenario) => {
    setScenarioState(next)
    persistScenario(next)
  }, [])

  const patchScenario = useCallback((patch: Partial<KanbanScenario>) => {
    setScenarioState(prev => {
      const next = { ...prev, ...patch }
      persistScenario(next)
      return next
    })
  }, [])

  const resetScenario = useCallback(() => {
    setScenario({ ...DEFAULT_KANBAN_SCENARIO })
  }, [setScenario])

  return { scenario, setScenario, patchScenario, resetScenario }
}
