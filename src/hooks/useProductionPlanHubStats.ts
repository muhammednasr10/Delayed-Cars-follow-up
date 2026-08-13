import { useEffect, useState } from 'react'
import {
  getModelPlanTargets,
  getYearMonthlyPlanTargets,
  planTargetsMap,
  wipCarryoverMap
} from '../services/modelProductionPlanService'
import { getExitProductivityMonth, getExitProductivityYear } from '../services/exitProductivityService'
import { getProductionPlanWorkDays } from '../services/productionPlanWorkDaysService'
import { getVehicleModels } from '../services/settingsService'
import { computeTaktMinutes, formatTaktMinutes } from '../Utils/productionLineRate'
import {
  buildAchievedByModelIdFromExitRecords,
  buildAnnualSectionsFromMonthlyPlans,
  buildPlanSections,
  planProgressPercent,
  sumPlanSectionsAchieved,
  sumPlanSectionsPlanned,
  sumPlanSectionsWip,
  type PlanSection
} from '../Utils/productionPlanSummary'

export type PlanFamilySummaryRow = {
  key: string
  label: string
  planned: number
  achieved: number
}

function currentYm(): { year: number; month: number; monthValue: string } {
  const d = new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return {
    year,
    month,
    monthValue: `${year}-${String(month).padStart(2, '0')}`
  }
}

function familyRowsFromSections(sections: PlanSection[]): PlanFamilySummaryRow[] {
  return sections
    .filter(section => section.group.planned > 0 || section.group.achieved > 0)
    .map(section => ({
      key: section.group.key,
      label: section.group.label,
      planned: section.group.planned,
      achieved: section.group.achieved
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
}

export type ProductionPlanHubStats = {
  year: number
  month: number
  monthValue: string
  planned: number
  achieved: number
  progress: number
  wip: number
  monthlyFamilies: PlanFamilySummaryRow[]
  annualPlanned: number
  annualAchieved: number
  annualProgress: number
  annualFamilies: PlanFamilySummaryRow[]
  availableDays: number
  availableHours: number
  lineJph: number
  taktLabel: string
  loading: boolean
}

const emptyStats = (): ProductionPlanHubStats => {
  const { year, month, monthValue } = currentYm()
  return {
    year,
    month,
    monthValue,
    planned: 0,
    achieved: 0,
    progress: 0,
    wip: 0,
    monthlyFamilies: [],
    annualPlanned: 0,
    annualAchieved: 0,
    annualProgress: 0,
    annualFamilies: [],
    availableDays: 0,
    availableHours: 0,
    lineJph: 0,
    taktLabel: '—',
    loading: true
  }
}

export function useProductionPlanHubStats(refreshKey = 0): ProductionPlanHubStats {
  const [stats, setStats] = useState<ProductionPlanHubStats>(emptyStats)

  useEffect(() => {
    let cancelled = false
    const { year, month, monthValue } = currentYm()
    setStats(prev => ({ ...prev, loading: true }))

    void Promise.all([
      getVehicleModels().catch(() => []),
      getModelPlanTargets(year, month).catch(() => []),
      getYearMonthlyPlanTargets(year).catch(() => []),
      getExitProductivityYear(year).catch(() => []),
      getExitProductivityMonth(year, month).catch(() => []),
      getProductionPlanWorkDays(year, month).catch(() => null)
    ])
      .then(([models, dbTargets, yearMonthlyTargets, yearExitRows, monthExitRows, workConfig]) => {
        if (cancelled) return

        const planTargets = planTargetsMap(dbTargets)
        const wipCarryover = wipCarryoverMap(dbTargets)
        const achievedByModelId = buildAchievedByModelIdFromExitRecords(monthExitRows)
        const planSections = buildPlanSections(models, planTargets, achievedByModelId, wipCarryover)
        const monthlyFamilies = familyRowsFromSections(planSections)

        const annualSections = buildAnnualSectionsFromMonthlyPlans(models, yearMonthlyTargets, yearExitRows)
        const annualFamilies = familyRowsFromSections(annualSections)

        const planned = sumPlanSectionsPlanned(planSections)
        const achieved = sumPlanSectionsAchieved(planSections)
        const annualPlanned = sumPlanSectionsPlanned(annualSections)
        const annualAchieved = sumPlanSectionsAchieved(annualSections)
        const lineJph = workConfig?.lineJph ?? 0
        const taktMinutes = computeTaktMinutes(lineJph > 0 ? lineJph : null)

        setStats({
          year,
          month,
          monthValue,
          planned,
          achieved,
          progress: planProgressPercent(planned, achieved),
          wip: sumPlanSectionsWip(planSections),
          monthlyFamilies,
          annualPlanned,
          annualAchieved,
          annualProgress: planProgressPercent(annualPlanned, annualAchieved),
          annualFamilies,
          availableDays: workConfig?.availableDays ?? 0,
          availableHours: workConfig?.availableHours ?? 0,
          lineJph,
          taktLabel: taktMinutes != null ? formatTaktMinutes(taktMinutes) : '—',
          loading: false
        })
      })
      .catch(() => {
        if (cancelled) return
        setStats({ ...emptyStats(), loading: false })
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return stats
}
