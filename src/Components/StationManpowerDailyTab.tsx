import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, Users } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { inputCls } from './FormField'
import { StationManpowerParentGroup } from './StationManpowerParentGroup'
import { localTodayIso } from '../services/attendanceService'
import { getParentStationOperationsGroups } from '../services/stationOperationsService'
import {
  buildStationManpowerDayRows,
  getAllStationManpowerForDate,
  saveModelStationManpowerOverrides,
  saveStationManpowerForDate
} from '../services/stationManpowerDailyService'
import { compareEmployees } from '../services/employeesService'
import { groupManpowerDayRows } from '../Utils/stationManpowerGroups'
import {
  buildLineBalanceHeadcountByModel,
  buildLineBalanceLabelsByModel,
  formatOperationsLabelComparison,
  labelsForStationAcrossModels,
  maxHeadcountForParent
} from '../Utils/lineBalanceManpowerLabels'
import {
  detectModelOverrides,
  effectiveModelRows,
  emptyManpowerDayState,
  updateGeneralRow,
  upsertModelOverride,
  type ManpowerDayState
} from '../Utils/stationManpowerInheritance'
import type { Employee } from '../Types/employee'
import type { Station, VehicleModel } from '../Types/settings'
import type { StationManpowerDayEdit } from '../Types/stationManpowerDaily'

type Props = {
  stations: Station[]
  employees: Employee[]
  models: VehicleModel[]
  canManage: boolean
}

function buildDayStateFromDb(
  stations: Station[],
  savedRows: Awaited<ReturnType<typeof getAllStationManpowerForDate>>,
  familyModelIds: string[]
): ManpowerDayState {
  const generalSaved = savedRows.filter(r => !r.vehicleModelId)
  const generalRows = buildStationManpowerDayRows(stations, generalSaved)

  const modelRows = new Map<string, StationManpowerDayEdit[]>()
  const overrideStations = new Map<string, Set<string>>()

  for (const modelId of familyModelIds) {
    const modelSaved = savedRows.filter(r => r.vehicleModelId === modelId)
    if (modelSaved.length === 0) continue

    const built = buildStationManpowerDayRows(stations, modelSaved)
    const modelStationIds = new Set(modelSaved.map(r => r.stationId))
    const overrides = detectModelOverrides(
      generalRows,
      built.filter(row => modelStationIds.has(row.stationId))
    )
    if (overrides.size > 0) {
      overrideStations.set(modelId, overrides)
      modelRows.set(
        modelId,
        built.filter(row => overrides.has(row.stationId))
      )
    }
  }

  return { generalRows, modelRows, overrideStations }
}

export function StationManpowerDailyTab({ stations, employees, models, canManage }: Props) {
  const { t } = useLang()
  const [workDate, setWorkDate] = useState(localTodayIso())
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [dayState, setDayState] = useState<ManpowerDayState | null>(null)
  const [lineBalanceLabels, setLineBalanceLabels] = useState<Map<string, Map<string, string>>>(new Map())
  const [lineBalanceHeadcount, setLineBalanceHeadcount] = useState<Map<string, Map<string, number>>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const activeEmployees = [...employees].filter(e => e.isActive).sort(compareEmployees)
  const familyModels = useMemo(
    () => models.filter(m => m.is_active && m.model_kind === 'family').sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [models]
  )
  const familyModelIds = useMemo(() => familyModels.map(m => m.id), [familyModels])

  const displayRows = useMemo(() => {
    if (!dayState) return []
    const assignmentRows = activeModelId
      ? effectiveModelRows(dayState.generalRows, activeModelId, dayState)
      : dayState.generalRows

    if (!activeModelId) return assignmentRows

    const labels = lineBalanceLabels.get(activeModelId) ?? new Map<string, string>()
    return assignmentRows.map(row => ({
      ...row,
      operationsSummary: labels.get(row.stationId) ?? ''
    }))
  }, [dayState, activeModelId, lineBalanceLabels])

  const groups = useMemo(() => groupManpowerDayRows(displayRows), [displayRows])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [saved, parentGroups] = await Promise.all([
        getAllStationManpowerForDate(workDate),
        getParentStationOperationsGroups()
      ])
      setLineBalanceLabels(buildLineBalanceLabelsByModel(parentGroups, models, familyModels))
      setLineBalanceHeadcount(buildLineBalanceHeadcountByModel(parentGroups, familyModels))
      const baseGeneral = buildStationManpowerDayRows(stations, saved.filter(r => !r.vehicleModelId))
      setDayState(
        saved.some(r => r.vehicleModelId)
          ? buildDayStateFromDb(stations, saved, familyModelIds)
          : emptyManpowerDayState(baseGeneral)
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
      setDayState(emptyManpowerDayState(buildStationManpowerDayRows(stations, [], new Map())))
      setLineBalanceLabels(new Map())
      setLineBalanceHeadcount(new Map())
    } finally {
      setLoading(false)
    }
  }, [workDate, stations, familyModelIds, familyModels, models, t])

  useEffect(() => {
    void load()
  }, [load])

  function setEmployeeIds(stationId: string, employeeIds: string[]) {
    if (!dayState) return
    setDayState(prev => {
      if (!prev) return prev
      if (!activeModelId) {
        return updateGeneralRow(prev, stationId, { employeeIds }, familyModelIds)
      }
      const baseRow = effectiveModelRows(prev.generalRows, activeModelId, prev).find(r => r.stationId === stationId)
      if (!baseRow) return prev
      return upsertModelOverride(prev, activeModelId, stationId, { employeeIds }, baseRow)
    })
    setSuccess('')
  }

  function getOperationsComparison(stationId: string): string {
    return formatOperationsLabelComparison(
      labelsForStationAcrossModels(stationId, lineBalanceLabels, familyModels),
      t
    )
  }

  async function save() {
    if (!canManage || !dayState) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (!activeModelId) {
        await saveStationManpowerForDate(
          workDate,
          null,
          dayState.generalRows.map(row => ({ stationId: row.stationId, employeeIds: row.employeeIds }))
        )
      } else {
        const overrides = dayState.overrideStations.get(activeModelId) ?? new Set<string>()
        const effective = effectiveModelRows(dayState.generalRows, activeModelId, dayState)
        const overrideRows = effective.filter(row => overrides.has(row.stationId))
        await saveModelStationManpowerOverrides(
          workDate,
          activeModelId,
          overrideRows.map(row => ({ stationId: row.stationId, employeeIds: row.employeeIds }))
        )
      }
      setSuccess(t('manpower.daily.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const activeModelName =
    activeModelId == null ? t('manpower.daily.generalTab') : familyModels.find(m => m.id === activeModelId)?.name

  const scopeHint =
    activeModelId == null
      ? t('manpower.daily.generalScope')
      : (dayState?.overrideStations.get(activeModelId)?.size ?? 0) > 0
        ? t('manpower.daily.modelOverrideScope', { model: activeModelName ?? '' })
        : t('manpower.daily.modelInheritedScope', { model: activeModelName ?? '' })

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('manpower.daily.title')}</h3>
            <p className="text-sm text-slate-400">{t('manpower.daily.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-400">{t('manpower.date')}</span>
            <input type="date" className={inputCls()} value={workDate} onChange={e => setWorkDate(e.target.value)} />
          </label>
          {canManage && (
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void save()}
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              <Save className="mr-1 inline h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveModelId(null)}
          className={`rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
            activeModelId == null ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {t('manpower.daily.generalTab')}
        </button>
        {familyModels.map(model => (
          <button
            key={model.id}
            type="button"
            onClick={() => setActiveModelId(model.id)}
            className={`rounded-xl px-3 py-2 text-sm font-black sm:px-4 ${
              activeModelId === model.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {model.name}
            {(dayState?.overrideStations.get(model.id)?.size ?? 0) > 0 && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title={t('manpower.daily.hasOverrides')} />
            )}
          </button>
        ))}
      </nav>

      <p className="text-xs text-slate-500">{scopeHint}</p>
      <p className="text-xs text-slate-500">
        {activeModelId == null ? t('manpower.daily.generalOperationsHint') : t('manpower.daily.modelOperationsHint')}
      </p>
      <p className="text-xs text-slate-500">{t('manpower.daily.hint')}</p>
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {loading ? (
        <p className="p-8 text-center text-slate-500">{t('common.loading')}</p>
      ) : groups.length === 0 ? (
        <p className="p-8 text-center text-slate-500">{t('manpower.daily.noStations')}</p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <StationManpowerParentGroup
              key={group.parentCode}
              group={group}
              employees={activeEmployees}
              canManage={canManage}
              operationsMode={activeModelId == null ? 'compare' : 'readonly'}
              getOperationsComparison={activeModelId == null ? getOperationsComparison : undefined}
              headcount={
                activeModelId == null
                  ? maxHeadcountForParent(
                      group.parentCode,
                      lineBalanceHeadcount,
                      familyModelIds,
                      group.workers.length
                    )
                  : lineBalanceHeadcount.get(activeModelId)?.get(group.parentCode) ?? group.workers.length
              }
              onEmployeeIds={setEmployeeIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
