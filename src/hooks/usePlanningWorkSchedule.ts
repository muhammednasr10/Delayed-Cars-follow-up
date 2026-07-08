import { useEffect, useMemo, useState } from 'react'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import {
  DEFAULT_SHIFT_HOURS,
  DEFAULT_WORK_SHIFT_END,
  DEFAULT_WORK_SHIFT_START,
  computeShiftHoursBetween
} from '../Utils/workScheduleDefaults'
import { DEFAULT_KANBAN_SCENARIO, type KanbanCalculationBasis, type KanbanScenario } from '../Types/kanbanFeeding'

const FALLBACK_JPH = 10

function currentYm(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

type PlanningSchedule = {
  jph: number
  shiftStart: string
  shiftEnd: string
  shiftHours: number
  loading: boolean
}

export function usePlanningWorkSchedule(): PlanningSchedule {
  const [jph, setJph] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const { year, month } = currentYm()
    void getProductionPlanWorkDays(year, month)
      .then(cfg => {
        if (!cancelled) setJph(cfg?.lineJph ?? 0)
      })
      .catch(() => {
        if (!cancelled) setJph(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const shiftStart = DEFAULT_WORK_SHIFT_START
  const shiftEnd = DEFAULT_WORK_SHIFT_END
  const shiftHours = useMemo(() => computeShiftHoursBetween(shiftStart, shiftEnd), [shiftStart, shiftEnd])

  return {
    jph: jph > 0 ? jph : FALLBACK_JPH,
    shiftStart,
    shiftEnd,
    shiftHours: shiftHours > 0 ? shiftHours : DEFAULT_SHIFT_HOURS,
    loading
  }
}

export function buildKanbanCalculationBasis(
  scenario: KanbanScenario,
  schedule: Pick<PlanningSchedule, 'jph' | 'shiftStart' | 'shiftEnd' | 'shiftHours'>
): KanbanCalculationBasis {
  return {
    ...scenario,
    jph: schedule.jph,
    shiftStart: schedule.shiftStart,
    shiftEnd: schedule.shiftEnd,
    shiftHours: schedule.shiftHours
  }
}

export function useKanbanCalculationBasis(scenario: KanbanScenario = DEFAULT_KANBAN_SCENARIO) {
  const schedule = usePlanningWorkSchedule()
  const basis = useMemo(() => buildKanbanCalculationBasis(scenario, schedule), [scenario, schedule])
  return { basis, schedule, loading: schedule.loading }
}
