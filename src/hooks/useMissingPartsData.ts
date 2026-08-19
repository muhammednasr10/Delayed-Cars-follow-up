import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useEmployees } from './useEmployees'
import { useFactoryOrgScope } from './useFactoryOrgScope'
import { useFormatError } from './useFormatError'
import { useOpenMissingPartsTab } from './useOpenMissingPartsTab'
import { getMissingParts } from '../services/missingPartsService'
import { listMissingPartWorkflowRequests } from '../services/missingPartWorkflowService'
import { getVehicleNoteCounts } from '../services/vehicleNotesService'
import { createTeamMission, listOpenShortageMissions } from '../services/missionService'
import type { MissingPartDetail, MissingPartFilters } from '../Types/missingPart'
import { EMPTY_MISSING_PART_FILTERS } from '../Types/missingPart'
import type { MissingPartWorkflowRequest } from '../Types/missingPartWorkflow'
import type { ShortageMissionLink } from '../Types/mission'
import type { ShortageMissionAssignInput } from '../Types/mpVehicleActions'
import {
  applyFilters,
  hasActiveMissingPartFilters,
  isSchemaMissing
} from '../Utils/missingPartPageUtils'
import { buildMissingPartTableRows } from '../Utils/missingPartDisplay'
import type { ListTab } from '../Components/missingParts/MissingPartsToolbar'

export function useMissingPartsData() {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { filterRecords, orgUnits } = useFactoryOrgScope(employees)

  const [items, setItems] = useState<MissingPartDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [listTab, setListTab] = useState<ListTab>('active')
  const [filters, setFilters] = useState<MissingPartFilters>(EMPTY_MISSING_PART_FILTERS)
  const [success, setSuccess] = useState('')
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({})
  const [shortageMissions, setShortageMissions] = useState<ShortageMissionLink[]>([])
  const [workflowRequests, setWorkflowRequests] = useState<MissingPartWorkflowRequest[]>([])
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set())
  const [assignMissionBusy, setAssignMissionBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getMissingParts())
      setSetupRequired(false)
      try {
        setWorkflowRequests(await listMissingPartWorkflowRequests('pending'))
      } catch {
        setWorkflowRequests([])
      }
    } catch (err) {
      const message = formatError(err)
      setSetupRequired(isSchemaMissing(message))
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [formatError])

  useEffect(() => {
    void load()
  }, [load])

  const onOpenMissingParts = useCallback((detail: { tab?: ListTab; search?: string }) => {
    if (detail.tab) setListTab(detail.tab)
    if (detail.search?.trim()) {
      setFilters(prev => ({ ...prev, search: detail.search!.trim() }))
    }
  }, [])

  useOpenMissingPartsTab(onOpenMissingParts)

  useEffect(() => {
    setSelectedVehicleIds(new Set())
  }, [listTab, filters])

  const modelOptions = useMemo(
    () => Array.from(new Set(items.map(i => i.modelName).filter(Boolean))).sort(),
    [items]
  )

  const scopedItems = useMemo(() => filterRecords(items), [items, filterRecords])

  const loadNoteCounts = useCallback(async (parts: MissingPartDetail[]) => {
    const ids = [...new Set(parts.map(p => p.vehicleId))]
    try {
      setNoteCounts(await getVehicleNoteCounts(ids))
    } catch {
      setNoteCounts({})
    }
  }, [])

  const loadShortageMissions = useCallback(async (parts: MissingPartDetail[]) => {
    const ids = [...new Set(parts.map(p => p.vehicleId))]
    try {
      setShortageMissions(await listOpenShortageMissions(ids))
    } catch {
      setShortageMissions([])
    }
  }, [])

  useEffect(() => {
    void loadNoteCounts(scopedItems)
  }, [scopedItems, loadNoteCounts])

  const activeItems = useMemo(() => scopedItems.filter(i => !i.shortageResolvedAt), [scopedItems])
  const historyItems = useMemo(() => scopedItems.filter(i => !!i.shortageResolvedAt), [scopedItems])
  const activeVehicleCount = useMemo(() => new Set(activeItems.map(i => i.vehicleId)).size, [activeItems])
  const historyVehicleCount = useMemo(() => new Set(historyItems.map(i => i.vehicleId)).size, [historyItems])

  useEffect(() => {
    void loadShortageMissions(activeItems)
  }, [activeItems, loadShortageMissions])

  const tabSource = useMemo(() => {
    const source = listTab === 'history' || listTab === 'historySummary' ? historyItems : activeItems
    return source.slice()
  }, [listTab, historyItems, activeItems])

  const filtered = useMemo(
    () =>
      applyFilters(tabSource, filters, {
        dateField: listTab === 'history' || listTab === 'historySummary' ? 'resolved' : 'created',
        orgUnits
      }).slice(),
    [tabSource, filters, listTab, orgUnits]
  )
  const tableRows = buildMissingPartTableRows(filtered, listTab === 'history' ? 'resolved-desc' : 'created-asc')
  const tabVehicleCount = useMemo(() => new Set(tabSource.map(i => i.vehicleId)).size, [tabSource])
  const filteredVehicleCount = useMemo(() => new Set(filtered.map(i => i.vehicleId)).size, [filtered])
  const hasActiveFilter = hasActiveMissingPartFilters(filters)

  function changeListTab(tab: ListTab) {
    const leavingArchive =
      (listTab === 'history' || listTab === 'historySummary') && tab !== 'history' && tab !== 'historySummary'
    if (leavingArchive) setFilters(p => (p.resolvedMonth ? { ...p, resolvedMonth: null } : p))
    setListTab(tab)
  }

  function showSuccess(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 3500)
  }

  async function assignShortageMission(row: MissingPartDetail, input: ShortageMissionAssignInput) {
    setAssignMissionBusy(true)
    setError('')
    try {
      const vin = row.vin.trim()
      const model = row.modelName.trim()
      await createTeamMission({
        ...input,
        description: input.description?.trim() || [vin, model].filter(Boolean).join(' · '),
        sourceVehicleId: row.vehicleId,
        sourceMissingPartId: row.id,
        sourceVin: vin || null,
        sourceModelName: model || null
      })
      showSuccess(t('mp.assignMission.success'))
      void loadShortageMissions(activeItems)
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const msg =
        raw === 'ASSIGNEE_NOT_SUBORDINATE' || raw.includes('ASSIGNEE_NOT_SUBORDINATE')
          ? t('missions.errAssigneeNotSubordinate')
          : formatError(err)
      setError(msg)
      throw new Error(msg)
    } finally {
      setAssignMissionBusy(false)
    }
  }

  return {
    items,
    loading,
    error,
    setError,
    setupRequired,
    success,
    showSuccess,
    load,
    listTab,
    changeListTab,
    setListTab,
    filters,
    setFilters,
    scopedItems,
    activeItems,
    historyItems,
    tabSource,
    filtered,
    tableRows,
    modelOptions,
    activeVehicleCount,
    historyVehicleCount,
    tabVehicleCount,
    filteredVehicleCount,
    hasActiveFilter,
    noteCounts,
    loadNoteCounts,
    shortageMissions,
    assignShortageMission,
    assignMissionBusy,
    workflowRequests,
    selectedVehicleIds,
    setSelectedVehicleIds
  }
}
