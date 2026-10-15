import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { assignIplPartToWorkerLine } from '../../services/stationOperationsService'
import { fetchIplFittedPartsForModels } from '../../services/iplStationPartsService'
import { getStations } from '../../services/settingsService'
import type { ParentStationOperationsGroup, WorkerOperationsGroup } from '../../Types/timeStudy'
import type { Station, VehicleModel } from '../../Types/settings'
import { masterStationsForBom } from '../../Utils/bomStationCode'
import { IPL_OPERATION_KINDS, iplOperationKindFromName } from '../../Utils/iplOperationKind'
import { iplPartIdFromNotes, iplStationKey, type IplStationPart } from '../../Utils/iplStationParts'
import { formatStationReferenceCode, formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import { defaultIplCompareModelNames, selectableVehicleModels } from '../../Utils/vehicleModelHierarchy'
import { inputCls } from '../FormField'
import { IplModelTabsBar } from '../bom/IplModelTabsBar'

type Props = {
  canManage: boolean
  models: VehicleModel[]
  parentGroups: ParentStationOperationsGroup[]
  groupsLoading?: boolean
  onChanged: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

function workerLabel(worker: WorkerOperationsGroup): string {
  const code = formatStationWorkerDisplayCode(worker.displayCode || worker.stationNumber)
  const line = code.match(/L\d+/i)?.[0]?.toUpperCase() ?? code
  const name = worker.worker1OperationsSummary?.trim()
  return name ? `${line} — ${name}` : line
}

function parentForStation(groups: ParentStationOperationsGroup[], stationKey: string) {
  return (
    groups.find(
      group =>
        iplStationKey(group.stationNumber) === stationKey || iplStationKey(group.displayCode) === stationKey
    ) ?? null
  )
}

function assignmentFor(parent: ParentStationOperationsGroup | null, partId: string) {
  if (!parent) return { workerId: '', kind: '' }
  for (const worker of parent.workers) {
    const operation = worker.operations.find(op => iplPartIdFromNotes(op.notes) === partId)
    if (!operation) continue
    return { workerId: worker.stationId, kind: iplOperationKindFromName(operation.operationNameAr) }
  }
  return { workerId: '', kind: '' }
}

export function OperationPartsTab({ canManage, models, parentGroups, groupsLoading = false, onChanged, notify }: Props) {
  const { t } = useLang()
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [stationId, setStationId] = useState('')
  const [search, setSearch] = useState('')
  const [factoryStations, setFactoryStations] = useState<Station[]>([])
  const [partsByStation, setPartsByStation] = useState<Map<string, IplStationPart[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [busyPartId, setBusyPartId] = useState('')
  const [kindDraft, setKindDraft] = useState<Record<string, string>>({})
  const didInitTabs = useRef(false)

  const assignableModels = useMemo(() => selectableVehicleModels(models), [models])
  const masterStations = useMemo(() => masterStationsForBom(factoryStations), [factoryStations])
  const openKey = openTabs.join('\u0001')
  const selectedModel = openTabs.length === 1 ? models.find(model => model.name === openTabs[0]) ?? null : null
  const selectedStationKey = useMemo(() => {
    const station = masterStations.find(item => item.id === stationId)
    return station ? iplStationKey(station.station_number) : ''
  }, [masterStations, stationId])

  useEffect(() => {
    getStations()
      .then(setFactoryStations)
      .catch(() => setFactoryStations([]))
  }, [])

  useEffect(() => {
    if (didInitTabs.current || assignableModels.length === 0) return
    didInitTabs.current = true
    const defaults = defaultIplCompareModelNames(models, assignableModels)
    setOpenTabs(defaults.length > 0 ? defaults : assignableModels.map(model => model.name))
  }, [assignableModels, models])

  function toggleModel(name: string) {
    setOpenTabs(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name].sort((a, b) => a.localeCompare(b))
    )
  }

  function toggleFamily(names: string[]) {
    setOpenTabs(prev => {
      const allOn = names.length > 0 && names.every(name => prev.includes(name))
      return allOn
        ? prev.filter(name => !names.includes(name))
        : [...new Set([...prev, ...names])].sort((a, b) => a.localeCompare(b))
    })
  }

  useEffect(() => {
    if (openTabs.length === 0) {
      setPartsByStation(new Map())
      return
    }
    let cancelled = false
    setLoading(true)
    fetchIplFittedPartsForModels(openTabs)
      .then(grouped => {
        if (!cancelled) setPartsByStation(grouped)
      })
      .catch(() => {
        if (!cancelled) setPartsByStation(new Map())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [openKey])

  const stations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...partsByStation.entries()]
      .filter(([stationKey]) => !selectedStationKey || stationKey === selectedStationKey)
      .map(([stationKey, parts]) => {
        const visible = query
          ? parts.filter(
              part =>
                part.partName.toLowerCase().includes(query) || part.partNumber.toLowerCase().includes(query)
            )
          : parts
        return [stationKey, visible] as const
      })
      .filter(([, parts]) => parts.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
  }, [partsByStation, search, selectedStationKey])

  async function save(part: IplStationPart, stationKey: string, workerId: string, kind: string) {
    const model = selectedModel ?? models.find(item => openTabs.includes(item.name)) ?? null
    if (!canManage || !model) return
    const parent = parentForStation(parentGroups, stationKey)
    if (!parent) {
      notify(t('engineering.opParts.noStation'), true)
      return
    }
    if (workerId && !kind) {
      notify(t('engineering.opParts.pickKind'), true)
      return
    }
    setBusyPartId(part.partId)
    try {
      await assignIplPartToWorkerLine({
        part,
        workerStationId: workerId || null,
        parentModelId: model.id,
        operationType: selectedModel ? selectedModel.name : 'common',
        operationKind: kind,
        operations: parent.workers.flatMap(worker => worker.operations)
      })
      setKindDraft(prev => {
        const next = { ...prev }
        delete next[part.partId]
        return next
      })
      await onChanged()
      notify(workerId ? t('engineering.opParts.assigned') : t('engineering.opParts.cleared'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error')
      notify(message === 'OPERATION_NAME_EXISTS_ON_TARGET' ? t('operations.moveDuplicate') : message, true)
    } finally {
      setBusyPartId('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <label className="relative block">
          <span className="sr-only">{t('bom.search')}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputCls()} w-full ps-9`}
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('bom.searchPh')}
          />
        </label>
        <div className="mt-3 border-t border-slate-800/80 pt-3">
          <IplModelTabsBar
            models={assignableModels}
            allModels={models}
            openTabs={openTabs}
            onToggleModel={toggleModel}
            onToggleFamily={toggleFamily}
          />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.filterStation')}</span>
              <select className={inputCls()} value={stationId} onChange={event => setStationId(event.target.value)}>
                <option value="">{t('bom.allStations')}</option>
                {masterStations.map(station => (
                  <option key={station.id} value={station.id}>
                    {formatStationReferenceCode(station.station_number)} — {station.station_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t('engineering.opParts.hint')}</p>
      </div>

      {openTabs.length === 0 ? (
        <p className="card-industrial p-6 text-center text-sm text-slate-400">{t('engineering.opParts.pickModel')}</p>
      ) : loading ? (
        <p className="card-industrial p-6 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : stations.length === 0 ? (
        <p className="card-industrial p-6 text-center text-sm text-slate-400">{t('engineering.opParts.noIplParts')}</p>
      ) : (
        stations.map(([stationKey, parts]) => {
          const parent = parentForStation(parentGroups, stationKey)
          return (
            <section key={stationKey} className="card-industrial overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
                <h3 className="font-black text-slate-100" dir="ltr">
                  {parent?.displayCode || stationKey}
                  {parent?.stationName ? <span className="ms-2 text-sm font-bold text-slate-400">{parent.stationName}</span> : null}
                </h3>
                <span className="text-xs text-slate-500">{t('engineering.opParts.partCount', { n: parts.length })}</span>
              </header>
              {groupsLoading && parentGroups.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">{t('common.loading')}</p>
              ) : !parent || parent.workers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-amber-200">{t('engineering.opParts.noWorkers')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="p-3 text-start">{t('operations.cols.part')}</th>
                        <th className="p-3 text-start">{t('operations.cols.partNumber')}</th>
                        <th className="p-3 text-center">{t('operations.cols.partQty')}</th>
                        <th className="p-3 text-start">{t('engineering.opParts.kind')}</th>
                        <th className="p-3 text-start">{t('engineering.opParts.worker')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(part => {
                        const assigned = assignmentFor(parent, part.partId)
                        const kind = kindDraft[part.partId] ?? assigned.kind
                        const busy = busyPartId === part.partId
                        return (
                          <tr key={part.partId} className="border-b border-slate-800/60">
                            <td className="p-3 font-bold text-slate-100">{part.partName}</td>
                            <td className="p-3 font-mono text-cyan-200" dir="ltr">
                              {part.partNumber}
                            </td>
                            <td className="p-3 text-center font-mono" dir="ltr">
                              {part.quantity}
                            </td>
                            <td className="p-3">
                              <select
                                className="input-industrial w-full"
                                value={kind}
                                disabled={!canManage || busy}
                                onChange={event => {
                                  const nextKind = event.target.value
                                  setKindDraft(prev => ({ ...prev, [part.partId]: nextKind }))
                                  if (assigned.workerId) void save(part, stationKey, assigned.workerId, nextKind)
                                }}
                              >
                                <option value="">{t('engineering.opParts.pickKind')}</option>
                                {IPL_OPERATION_KINDS.map(item => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                className="input-industrial w-full"
                                value={assigned.workerId}
                                disabled={!canManage || busy}
                                onChange={event => void save(part, stationKey, event.target.value, kind)}
                              >
                                <option value="">{t('operations.lineUnassigned')}</option>
                                {parent.workers.map(worker => (
                                  <option key={worker.stationId} value={worker.stationId}>
                                    {workerLabel(worker)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
