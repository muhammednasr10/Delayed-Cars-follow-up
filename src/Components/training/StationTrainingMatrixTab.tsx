import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, CheckCircle2, Grid3x3, ListOrdered, Search, Users, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { EmptyState } from '../EmptyState'
import { StationTrainingSummaryModal } from './StationTrainingSummaryModal'
import { setEmployeeStationLevel } from '../../services/employeeStationLevelService'
import type { TrainingLevel } from '../../Types/enums'
import type { Employee } from '../../Types/employee'
import type { EmployeeStationLevel } from '../../Types/training'
import type { Station } from '../../Types/settings'

type Props = {
  employees: Employee[]
  stations: Station[]
  levels: EmployeeStationLevel[]
  canManage: boolean
  onChanged: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

type PickerState = {
  employeeId: string
  stationId: string
  levelTrack: number
  x: number
  y: number
}

type MatrixColumn = {
  stationId: string
  stationNumber: string
  stationName: string
  levelTrack: number
  label: string
}

const WORK_LEVELS: TrainingLevel[] = ['level_1', 'level_2', 'level_3', 'level_4']

const LEVEL_TONE: Record<TrainingLevel, string> = {
  level_0: 'bg-slate-800/30 text-slate-600 ring-slate-700/40',
  level_1: 'bg-amber-500/25 text-amber-100 ring-amber-400/40',
  level_2: 'bg-yellow-500/25 text-yellow-100 ring-yellow-400/40',
  level_3: 'bg-emerald-500/25 text-emerald-100 ring-emerald-400/40',
  level_4: 'bg-cyan-500/25 text-cyan-100 ring-cyan-400/40'
}

const LEVEL_SHORT = ['L1', 'L2', 'L3', 'L4'] as const

function sortStations(a: Station, b: Station) {
  const oa = a.sort_order ?? 0
  const ob = b.sort_order ?? 0
  if (oa !== ob) return oa - ob
  return a.station_number.localeCompare(b.station_number, undefined, { numeric: true })
}

function stationColLabel(stationNumber: string, levelTrack: number) {
  return `${stationNumber}-${LEVEL_SHORT[levelTrack - 1]}`
}

function cellKey(employeeId: string, stationId: string, levelTrack: number) {
  return `${employeeId}:${stationId}:${levelTrack}`
}

function activeEmployeeList(employees: Employee[]) {
  return employees.filter(e => e.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'))
}

function masterStations(stations: Station[]) {
  return stations.filter(s => s.is_active && !s.parent_station_id).sort(sortStations)
}

function buildMatrixColumns(stations: Station[]): MatrixColumn[] {
  return stations.flatMap(st =>
    LEVEL_SHORT.map((_, idx) => {
      const levelTrack = idx + 1
      return {
        stationId: st.id,
        stationNumber: st.station_number,
        stationName: st.station_name,
        levelTrack,
        label: stationColLabel(st.station_number, levelTrack)
      }
    })
  )
}

export function StationTrainingMatrixTab({ employees, stations, levels, canManage, onChanged, notify }: Props) {
  const { t } = useLang()
  const [stationFilter, setStationFilter] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [picker, setPicker] = useState<PickerState | null>(null)

  const [employeeQuery, setEmployeeQuery] = useState('')
  const [quickEmployeeId, setQuickEmployeeId] = useState('')
  const [quickVirtualKey, setQuickVirtualKey] = useState('')
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const topInnerRef = useRef<HTMLDivElement>(null)
  const employeeBoxRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())

  const allActiveEmployees = useMemo(() => activeEmployeeList(employees), [employees])
  const activeEmployeeIds = useMemo(() => new Set(allActiveEmployees.map(e => e.id)), [allActiveEmployees])
  const allMasterStations = useMemo(() => masterStations(stations), [stations])

  const matrixStations = useMemo(() => {
    if (!stationFilter) return allMasterStations
    return allMasterStations.filter(s => s.id === stationFilter)
  }, [allMasterStations, stationFilter])

  const matrixColumns = useMemo(() => buildMatrixColumns(matrixStations), [matrixStations])
  const allVirtualColumns = useMemo(() => buildMatrixColumns(allMasterStations), [allMasterStations])

  const levelMap = useMemo(() => {
    const map = new Map<string, EmployeeStationLevel>()
    levels.forEach(l => map.set(cellKey(l.employeeId, l.stationId, l.levelTrack), l))
    return map
  }, [levels])

  const employeeMatches = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase()
    if (!q) return allActiveEmployees.slice(0, 25)
    return allActiveEmployees
      .filter(e => e.fullName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))
      .slice(0, 25)
  }, [allActiveEmployees, employeeQuery])

  const quickEmployee = allActiveEmployees.find(e => e.id === quickEmployeeId) ?? null
  const quickVirtual = allVirtualColumns.find(c => `${c.stationId}:${c.levelTrack}` === quickVirtualKey) ?? null
  const quickLevel =
    quickEmployee && quickVirtual
      ? levelMap.get(cellKey(quickEmployee.id, quickVirtual.stationId, quickVirtual.levelTrack))?.level ?? null
      : null

  const summary = useMemo(() => {
    const workerCount = allActiveEmployees.length
    const virtualStationCount = matrixColumns.length
    const totalSlots = workerCount * virtualStationCount
    const byLevel: Record<TrainingLevel, number> = {
      level_0: 0,
      level_1: 0,
      level_2: 0,
      level_3: 0,
      level_4: 0
    }
    let assigned = 0
    let atLeastL3 = 0

    for (const emp of allActiveEmployees) {
      for (const col of matrixColumns) {
        const level = levelMap.get(cellKey(emp.id, col.stationId, col.levelTrack))?.level ?? null
        if (!level) continue
        assigned++
        byLevel[level]++
        if (level === 'level_3' || level === 'level_4') atLeastL3++
      }
    }

    const coverage = totalSlots > 0 ? Math.round((assigned / totalSlots) * 100) : 0
    const unassigned = totalSlots - assigned

    return {
      workerCount,
      virtualStationCount,
      physicalStationCount: matrixStations.length,
      totalSlots,
      assigned,
      unassigned,
      coverage,
      byLevel,
      atLeastL3
    }
  }, [allActiveEmployees, matrixColumns, matrixStations.length, levelMap])

  const syncTopWidth = useCallback(() => {
    if (tableRef.current && topInnerRef.current) {
      topInnerRef.current.style.width = `${tableRef.current.scrollWidth}px`
    }
  }, [])

  useLayoutEffect(() => {
    syncTopWidth()
  }, [syncTopWidth, allActiveEmployees, matrixColumns])

  useEffect(() => {
    const ro = new ResizeObserver(() => syncTopWidth())
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [syncTopWidth])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (employeeBoxRef.current && !employeeBoxRef.current.contains(e.target as Node)) {
        setEmployeeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!picker) return
    function close(e: MouseEvent) {
      const pop = document.getElementById('station-level-picker')
      if (pop?.contains(e.target as Node)) return
      setPicker(null)
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', close), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', close)
    }
  }, [picker])

  useEffect(() => {
    if (!quickEmployeeId) return
    const row = rowRefs.current.get(quickEmployeeId)
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [quickEmployeeId, matrixColumns])

  function onTopScroll() {
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
  }

  function onBottomScroll() {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft
    }
  }

  async function applyLevel(
    employeeId: string,
    stationId: string,
    levelTrack: number,
    target: TrainingLevel | null
  ) {
    if (!canManage) return
    const key = cellKey(employeeId, stationId, levelTrack)
    setBusyKey(key)
    try {
      await setEmployeeStationLevel(employeeId, stationId, levelTrack, target)
      await onChanged()
      setPicker(null)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusyKey('')
    }
  }

  function openPicker(
    e: React.MouseEvent,
    employeeId: string,
    stationId: string,
    levelTrack: number
  ) {
    if (!canManage) return
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({
      employeeId,
      stationId,
      levelTrack,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4
    })
  }

  function pickEmployee(emp: Employee) {
    setQuickEmployeeId(emp.id)
    setEmployeeQuery(`${emp.fullName} (${emp.employeeCode})`)
    setEmployeeDropdownOpen(false)
    setQuickVirtualKey('')
  }

  function clearQuickEmployee() {
    setQuickEmployeeId('')
    setEmployeeQuery('')
    setQuickVirtualKey('')
  }

  const pickerCurrent = picker
    ? levelMap.get(cellKey(picker.employeeId, picker.stationId, picker.levelTrack))?.level ?? null
    : null

  const pickerColumn = picker
    ? matrixColumns.find(c => c.stationId === picker.stationId && c.levelTrack === picker.levelTrack)
    : null

  const summaryCards = [
    {
      key: 'workers',
      icon: Users,
      label: t('training.stationMatrix.summary.workers'),
      value: String(summary.workerCount),
      tone: 'text-cyan-300'
    },
    {
      key: 'stations',
      icon: Grid3x3,
      label: t('training.stationMatrix.summary.virtualStations'),
      value: String(summary.virtualStationCount),
      sub: t('training.stationMatrix.summary.physicalStations', { n: summary.physicalStationCount }),
      tone: 'text-violet-300'
    },
    {
      key: 'assigned',
      icon: CheckCircle2,
      label: t('training.stationMatrix.summary.assigned'),
      value: String(summary.assigned),
      sub: t('training.stationMatrix.summary.coverage', { n: summary.coverage }),
      tone: 'text-emerald-300'
    },
    {
      key: 'unassigned',
      icon: BarChart3,
      label: t('training.stationMatrix.summary.unassigned'),
      value: String(summary.unassigned),
      sub: t('training.stationMatrix.summary.qualifiedL3', { n: summary.atLeastL3 }),
      tone: 'text-amber-300'
    }
  ]

  return (
    <div className="space-y-4">
      {allActiveEmployees.length > 0 && matrixColumns.length > 0 && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-400">
            {t('training.stationMatrix.summary.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryCards.map(card => {
              const Icon = card.icon
              return (
                <div key={card.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon className={`h-4 w-4 ${card.tone}`} />
                    {card.label}
                  </div>
                  <p className={`mt-1 text-2xl font-black ${card.tone}`}>{card.value}</p>
                  {card.sub && <p className="mt-0.5 text-[11px] text-slate-500">{card.sub}</p>}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-500">{t('training.stationMatrix.summary.byLevel')}:</span>
            {WORK_LEVELS.map(l => (
              <span key={l} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${LEVEL_TONE[l]}`}>
                {t(`training.stationMatrix.lvl.${l}`)}: {summary.byLevel[l]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card-industrial p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-slate-400">{t('training.stationMatrix.hint')}</p>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-black text-violet-200 ring-1 ring-violet-400/30 hover:bg-violet-500/25"
          >
            <ListOrdered className="h-4 w-4" />
            {t('training.stationMatrix.detailModal.button')}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-cyan-300">
            {t('training.stationMatrix.quickEdit.title')}
          </h4>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div ref={employeeBoxRef} className="relative">
              <label className="mb-1 block text-xs text-slate-500">{t('training.stationMatrix.quickEdit.employee')}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="input-dark ps-9"
                  placeholder={t('training.stationMatrix.quickEdit.employeePh')}
                  value={employeeQuery}
                  onChange={e => {
                    setEmployeeQuery(e.target.value)
                    setEmployeeDropdownOpen(true)
                    if (!e.target.value.trim()) clearQuickEmployee()
                  }}
                  onFocus={() => setEmployeeDropdownOpen(true)}
                />
                {quickEmployeeId && (
                  <button
                    type="button"
                    onClick={clearQuickEmployee}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {employeeDropdownOpen && employeeMatches.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                  {employeeMatches.map(emp => (
                    <li key={emp.id}>
                      <button
                        type="button"
                        onClick={() => pickEmployee(emp)}
                        className={`w-full px-3 py-2 text-start text-sm hover:bg-slate-800 ${
                          emp.id === quickEmployeeId ? 'bg-cyan-500/10 text-cyan-200' : 'text-slate-200'
                        }`}
                      >
                        <span className="block font-bold">{emp.fullName}</span>
                        <span className="block text-[11px] text-slate-500" dir="ltr">
                          {emp.employeeCode}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('training.stationMatrix.quickEdit.station')}</label>
              <select
                className="input-dark"
                value={quickVirtualKey}
                disabled={!quickEmployeeId}
                onChange={e => setQuickVirtualKey(e.target.value)}
              >
                <option value="">{t('training.stationMatrix.quickEdit.pickStation')}</option>
                {allVirtualColumns.map(col => (
                  <option key={`${col.stationId}:${col.levelTrack}`} value={`${col.stationId}:${col.levelTrack}`}>
                    {col.label} — {col.stationName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('training.stationMatrix.quickEdit.level')}</label>
              <div className="flex flex-wrap gap-2">
                {WORK_LEVELS.map(l => (
                  <button
                    key={l}
                    type="button"
                    disabled={!canManage || !quickEmployeeId || !quickVirtual || busyKey !== ''}
                    onClick={() =>
                      quickEmployee &&
                      quickVirtual &&
                      applyLevel(quickEmployee.id, quickVirtual.stationId, quickVirtual.levelTrack, l)
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-black ring-1 ${LEVEL_TONE[l]} ${
                      quickLevel === l ? 'ring-2 ring-white/50' : ''
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {t(`training.stationMatrix.lvl.${l}`)}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!canManage || !quickEmployeeId || !quickVirtual || !quickLevel || busyKey !== ''}
                  onClick={() =>
                    quickEmployee &&
                    quickVirtual &&
                    applyLevel(quickEmployee.id, quickVirtual.stationId, quickVirtual.levelTrack, null)
                  }
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 ring-1 ring-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('training.stationMatrix.quickEdit.clear')}
                </button>
              </div>
              {quickEmployee && quickVirtual && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('training.stationMatrix.quickEdit.current')}:{' '}
                  <span className="font-bold text-slate-300" dir="ltr">
                    {quickVirtual.label}{' '}
                    {quickLevel ? `→ ${t(`training.stationMatrix.lvl.${quickLevel}`)}` : '→ —'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-slate-500">{t('training.stationMatrix.tableStationFilter')}</label>
          <select className="input-dark max-w-md" value={stationFilter} onChange={e => setStationFilter(e.target.value)}>
            <option value="">{t('training.stationMatrix.allStations')}</option>
            {allMasterStations.map(s => (
              <option key={s.id} value={s.id}>
                {s.station_number} — {s.station_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        {allActiveEmployees.length === 0 || matrixColumns.length === 0 ? (
          <EmptyState
            title={t('training.stationMatrix.empty')}
            hint={canManage ? t('training.stationMatrix.emptyHint') : undefined}
          />
        ) : (
          <>
            <div
              ref={topScrollRef}
              onScroll={onTopScroll}
              className="overflow-x-auto border-b border-slate-800"
              aria-hidden
            >
              <div ref={topInnerRef} className="h-3" />
            </div>
            <div ref={bottomScrollRef} onScroll={onBottomScroll} className="overflow-x-auto">
              <table ref={tableRef} className="w-full border-collapse text-start text-sm">
                <thead className="bg-slate-950/90">
                  <tr>
                    <th className="sticky start-0 z-20 min-w-[140px] border-b border-slate-800 bg-slate-950/90 px-3 py-2 text-start text-xs font-black uppercase text-slate-400">
                      {t('training.rec.employee')}
                    </th>
                    {matrixColumns.map(col => (
                      <th
                        key={`${col.stationId}-${col.levelTrack}`}
                        className="min-w-[64px] border-b border-slate-800 px-1 py-2 text-center text-[10px] font-bold text-slate-300"
                        title={col.stationName}
                      >
                        <span className="block" dir="ltr">
                          {col.label}
                        </span>
                        <span className="block truncate text-[9px] font-normal text-slate-500">{col.stationName}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allActiveEmployees.map(emp => (
                    <tr
                      key={emp.id}
                      ref={el => {
                        if (el) rowRefs.current.set(emp.id, el)
                        else rowRefs.current.delete(emp.id)
                      }}
                      className={`border-t border-slate-800 ${emp.id === quickEmployeeId ? 'bg-cyan-500/5' : ''}`}
                    >
                      <td className="sticky start-0 z-10 bg-slate-900 px-3 py-2 font-bold text-slate-100">
                        <span className="block">{emp.fullName}</span>
                        <span className="block text-[10px] text-slate-500" dir="ltr">
                          {emp.employeeCode}
                        </span>
                      </td>
                      {matrixColumns.map(col => {
                        const current =
                          levelMap.get(cellKey(emp.id, col.stationId, col.levelTrack))?.level ?? null
                        const busy = busyKey === cellKey(emp.id, col.stationId, col.levelTrack)
                        const tone = current ? LEVEL_TONE[current] : LEVEL_TONE.level_0

                        return (
                          <td key={`${col.stationId}-${col.levelTrack}`} className="p-0.5 text-center">
                            <button
                              type="button"
                              disabled={!canManage || busy}
                              onClick={e => openPicker(e, emp.id, col.stationId, col.levelTrack)}
                              className={`flex h-9 w-full min-w-[60px] items-center justify-center rounded-md px-0.5 text-[10px] font-black ring-1 ${tone} ${
                                canManage ? 'cursor-pointer hover:brightness-125' : 'cursor-default'
                              } ${busy ? 'opacity-50' : ''}`}
                              title={t('training.stationMatrix.cellClick')}
                            >
                              {current ? t(`training.stationMatrix.lvl.${current}`) : '—'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <StationTrainingSummaryModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        stations={allMasterStations}
        levels={levels}
        activeEmployeeIds={activeEmployeeIds}
      />

      {picker && (
        <div
          id="station-level-picker"
          className="fixed z-50 min-w-[200px] rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
          style={{ left: picker.x, top: picker.y, transform: 'translateX(-50%)' }}
          onMouseDown={e => e.stopPropagation()}
        >
          {pickerColumn && (
            <p className="mb-1 px-1 text-[10px] font-bold text-cyan-300" dir="ltr">
              {pickerColumn.label}
            </p>
          )}
          <p className="mb-2 px-1 text-[11px] font-bold text-slate-400">{t('training.stationMatrix.picker.title')}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {WORK_LEVELS.map(l => (
              <button
                key={l}
                type="button"
                disabled={busyKey !== ''}
                onClick={() => applyLevel(picker.employeeId, picker.stationId, picker.levelTrack, l)}
                className={`rounded-lg px-2 py-2 text-xs font-black ring-1 ${LEVEL_TONE[l]} ${
                  pickerCurrent === l ? 'ring-2 ring-white/50' : ''
                }`}
              >
                {t(`training.stationMatrix.lvl.${l}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busyKey !== '' || !pickerCurrent}
            onClick={() => applyLevel(picker.employeeId, picker.stationId, picker.levelTrack, null)}
            className="mt-1.5 w-full rounded-lg bg-slate-800 py-1.5 text-xs font-bold text-slate-400 ring-1 ring-slate-700 disabled:opacity-40"
          >
            {t('training.stationMatrix.quickEdit.clear')}
          </button>
        </div>
      )}
    </div>
  )
}
