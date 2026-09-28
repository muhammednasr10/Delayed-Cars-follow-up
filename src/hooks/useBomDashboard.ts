import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBomDashboardStats } from '../services/bomDashboardService'
import { invalidateIplBomCache } from '../services/bomIplService'
import {
  loadIplDashboardDataset,
  prepareIplDashboardBase,
  type IplDashboardDataset
} from '../services/iplDashboardService'
import type { BomDashboardStats } from '../Types/bom'
import { buildIplSearchSuggestions, filterIplCompareRows, type IplDiffFilter, type IplFitClassFilter } from '../Utils/iplCompareFilters'
import { buildIplDashboardSummaryFromCompare } from '../Utils/iplDashboardSummary'
import { masterStationsForBom, normalizeBomStationCodeText } from '../Utils/bomStationCode'
import { defaultIplCompareModelNames, selectableVehicleModels } from '../Utils/vehicleModelHierarchy'

export function useBomDashboard() {
  const [stats, setStats] = useState<BomDashboardStats | null>(null)
  const [dataset, setDataset] = useState<IplDashboardDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [tabsReady, setTabsReady] = useState(false)
  const [stationId, setStationId] = useState('')
  const [fitFilter, setFitFilter] = useState<IplFitClassFilter>('')
  const [diffFilter, setDiffFilter] = useState<IplDiffFilter>('')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const reload = useCallback(async () => {
    invalidateIplBomCache()
    setLoading(true)
    setError('')
    try {
      const [bomStats, next] = await Promise.all([getBomDashboardStats(), loadIplDashboardDataset()])
      setStats(bomStats)
      setDataset(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search.trim()), 180)
    return () => window.clearTimeout(timer)
  }, [search])

  const assignableModels = useMemo(
    () => (dataset ? selectableVehicleModels(dataset.models) : []),
    [dataset]
  )
  const masterStations = useMemo(
    () => (dataset ? masterStationsForBom(dataset.stations) : []),
    [dataset]
  )

  useEffect(() => {
    if (!dataset || tabsReady || assignableModels.length === 0) return
    const defaults = defaultIplCompareModelNames(dataset.models, assignableModels)
    setOpenTabs(defaults.length > 0 ? defaults : assignableModels.map(model => model.name))
    setTabsReady(true)
  }, [dataset, tabsReady, assignableModels])

  const openTabsActive = useMemo(() => {
    const names = new Set(assignableModels.map(model => model.name))
    return openTabs.filter(name => names.has(name))
  }, [openTabs, assignableModels])

  const stationCode = useMemo(() => {
    if (!stationId) return undefined
    const station = masterStations.find(row => row.id === stationId)
    return station ? normalizeBomStationCodeText(station.station_number) : undefined
  }, [stationId, masterStations])

  const base = useMemo(() => {
    if (!dataset || !tabsReady) return null
    return prepareIplDashboardBase(dataset, openTabsActive, stationCode)
  }, [dataset, tabsReady, openTabsActive, stationCode])

  const iplSummary = useMemo(() => {
    if (!dataset || !base) return null
    const filtered = filterIplCompareRows(base.rows, {
      openTabs: openTabsActive,
      search: searchDebounced,
      fitFilter,
      diffFilter,
      fitCountsByKey: base.fitCounts,
      modelTotal: openTabsActive.length
    })
    return buildIplDashboardSummaryFromCompare(filtered, base.fitCounts, openTabsActive, dataset.stations)
  }, [dataset, base, openTabsActive, searchDebounced, fitFilter, diffFilter])

  const suggestions = useMemo(
    () => (base ? buildIplSearchSuggestions(base.rows, openTabsActive, search) : []),
    [base, openTabsActive, search]
  )

  function toggleModelTab(name: string) {
    setOpenTabs(prev => (prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name].sort((a, b) => a.localeCompare(b))))
  }

  function toggleFamilyTabs(variantNames: string[]) {
    setOpenTabs(prev => {
      const allOn = variantNames.length > 0 && variantNames.every(name => prev.includes(name))
      return allOn
        ? prev.filter(name => !variantNames.includes(name))
        : [...new Set([...prev, ...variantNames])].sort((a, b) => a.localeCompare(b))
    })
  }

  return {
    stats,
    iplSummary,
    loading,
    error,
    reload,
    models: dataset?.models ?? [],
    assignableModels,
    masterStations,
    openTabs: openTabsActive,
    toggleModelTab,
    toggleFamilyTabs,
    stationId,
    setStationId,
    fitFilter,
    setFitFilter,
    diffFilter,
    setDiffFilter,
    search,
    setSearch,
    suggestions
  }
}
