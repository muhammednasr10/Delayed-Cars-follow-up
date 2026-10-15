import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Search } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { assignIplPartToWorkerLine } from '../../services/stationOperationsService'
import { fetchIplFittedPartsForModels } from '../../services/iplStationPartsService'
import { getStations } from '../../services/settingsService'
import type { ParentStationOperationsGroup, WorkerOperationsGroup } from '../../Types/timeStudy'
import type { Station, VehicleModel } from '../../Types/settings'
import { masterStationsForBom } from '../../Utils/bomStationCode'
import { IPL_OPERATION_KINDS, iplOperationKindFromName } from '../../Utils/iplOperationKind'
import { iplPartCopyFromNotes, iplPartIdFromNotes, iplPartNumberFromNotes, iplStationKey, type IplStationPart } from '../../Utils/iplStationParts'
import { formatStationReferenceCode, formatStationWorkerDisplayCode } from '../../Utils/stationHierarchy'
import { defaultIplCompareModelNames, selectableVehicleModels } from '../../Utils/vehicleModelHierarchy'
import { inputCls } from '../FormField'
import { Modal } from '../Modal'
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

function modelsShare(part: IplStationPart, field: 'partNumber' | 'quantity'): boolean {
  if (part.models.length === 0) return true
  const values = part.models.map(item => item[field])
  return new Set(values).size <= 1
}

function rowKey(partId: string, copyIndex: number): string {
  return copyIndex > 0 ? `${partId}#${copyIndex}` : partId
}

function copyIndexesFor(
  parent: ParentStationOperationsGroup | null,
  partId: string,
  drafts: number[]
): number[] {
  const indexes = new Set<number>([0, ...drafts])
  for (const worker of parent?.workers ?? []) {
    for (const operation of worker.operations) {
      if (iplPartIdFromNotes(operation.notes) === partId) indexes.add(iplPartCopyFromNotes(operation.notes))
    }
  }
  return [...indexes].sort((a, b) => a - b)
}

function partNumberGroups(part: IplStationPart): { partNumber: string; quantity: number; models: string[] }[] {
  const map = new Map<string, { partNumber: string; quantity: number; models: string[]; quantities: Set<number> }>()
  for (const model of part.models) {
    const partNumber = model.partNumber || '—'
    const group = map.get(partNumber) ?? { partNumber, quantity: model.quantity, models: [], quantities: new Set<number>() }
    group.models.push(model.modelName)
    group.quantities.add(model.quantity)
    group.quantity = group.quantities.size === 1 ? model.quantity : 0
    map.set(partNumber, group)
  }
  return [...map.values()].map(({ quantities: _quantities, ...group }) => group)
}

function workerForNumber(
  parent: ParentStationOperationsGroup | null,
  partId: string,
  copyIndex: number,
  partNumber: string
): string {
  if (!parent) return ''
  for (const worker of parent.workers) {
    const hit = worker.operations.some(
      op =>
        iplPartIdFromNotes(op.notes) === partId &&
        iplPartCopyFromNotes(op.notes) === copyIndex &&
        iplPartNumberFromNotes(op.notes) === partNumber
    )
    if (hit) return worker.stationId
  }
  return ''
}

function hasSplitAssignments(parent: ParentStationOperationsGroup | null, partId: string, copyIndex: number): boolean {
  if (!parent) return false
  return parent.workers.some(worker =>
    worker.operations.some(
      op =>
        iplPartIdFromNotes(op.notes) === partId &&
        iplPartCopyFromNotes(op.notes) === copyIndex &&
        iplPartNumberFromNotes(op.notes) !== ''
    )
  )
}

function assignmentFor(parent: ParentStationOperationsGroup | null, partId: string, copyIndex: number) {
  if (!parent) return { workerId: '', kind: '' }
  for (const worker of parent.workers) {
    const operation = worker.operations.find(
      op =>
        iplPartIdFromNotes(op.notes) === partId &&
        iplPartCopyFromNotes(op.notes) === copyIndex &&
        iplPartNumberFromNotes(op.notes) === ''
    )
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
  const [draftCopies, setDraftCopies] = useState<Record<string, number[]>>({})
  const [distribution, setDistribution] = useState<Record<string, 'shared' | 'split'>>({})
  const [splitCard, setSplitCard] = useState<{
    part: IplStationPart
    stationKey: string
    copyIndex: number
    kind: string
    workers: Record<string, string>
  } | null>(null)
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
                part.partName.toLowerCase().includes(query) ||
                part.partNumber.toLowerCase().includes(query) ||
                part.models.some(
                  model =>
                    model.modelName.toLowerCase().includes(query) || model.partNumber.toLowerCase().includes(query)
                )
            )
          : parts
        return [stationKey, visible] as const
      })
      .filter(([, parts]) => parts.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
  }, [partsByStation, search, selectedStationKey])

  async function save(
    part: IplStationPart,
    stationKey: string,
    workerId: string,
    kind: string,
    copyIndex = 0,
    partNumberKey?: string
  ) {
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
    const key = rowKey(part.partId, copyIndex)
    setBusyPartId(key)
    try {
      await assignIplPartToWorkerLine({
        part,
        workerStationId: workerId || null,
        parentModelId: model.id,
        operationType: selectedModel ? selectedModel.name : 'common',
        operationKind: kind,
        copyIndex,
        partNumberKey,
        operations: parent.workers.flatMap(worker => worker.operations)
      })
      setKindDraft(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      if (!workerId && copyIndex > 0) {
        setDraftCopies(prev => ({
          ...prev,
          [part.partId]: (prev[part.partId] ?? []).filter(index => index !== copyIndex)
        }))
      }
      await onChanged()
      notify(workerId ? t('engineering.opParts.assigned') : t('engineering.opParts.cleared'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error')
      notify(message === 'OPERATION_NAME_EXISTS_ON_TARGET' ? t('operations.moveDuplicate') : message, true)
    } finally {
      setBusyPartId('')
    }
  }

  function duplicatePart(partId: string, stationKey: string) {
    const parent = parentForStation(parentGroups, stationKey)
    const indexes = copyIndexesFor(parent, partId, draftCopies[partId] ?? [])
    const next = Math.max(...indexes) + 1
    setDraftCopies(prev => ({ ...prev, [partId]: [...(prev[partId] ?? []), next] }))
  }

  function openSplitCard(part: IplStationPart, stationKey: string, copyIndex: number, kind: string) {
    const parent = parentForStation(parentGroups, stationKey)
    const workers: Record<string, string> = {}
    for (const group of partNumberGroups(part)) {
      workers[group.partNumber] = workerForNumber(parent, part.partId, copyIndex, group.partNumber)
    }
    setDistribution(prev => ({ ...prev, [rowKey(part.partId, copyIndex)]: 'split' }))
    setSplitCard({ part, stationKey, copyIndex, kind, workers })
  }

  async function saveSplitCard() {
    if (!splitCard) return
    const { part, stationKey, copyIndex, kind, workers } = splitCard
    const chosen = Object.values(workers).some(Boolean)
    if (chosen && !kind) {
      notify(t('engineering.opParts.pickKind'), true)
      return
    }
    const model = selectedModel ?? models.find(item => openTabs.includes(item.name)) ?? null
    const parent = parentForStation(parentGroups, stationKey)
    if (!canManage || !model || !parent) return
    const key = rowKey(part.partId, copyIndex)
    setBusyPartId(key)
    try {
      const operations = parent.workers.flatMap(worker => worker.operations)
      const operationType = selectedModel ? selectedModel.name : 'common'
      await assignIplPartToWorkerLine({
        part,
        workerStationId: null,
        parentModelId: model.id,
        operationType,
        operationKind: kind,
        copyIndex,
        operations
      })
      for (const group of partNumberGroups(part)) {
        await assignIplPartToWorkerLine({
          part,
          workerStationId: workers[group.partNumber] || null,
          parentModelId: model.id,
          operationType,
          operationKind: kind,
          copyIndex,
          partNumberKey: group.partNumber,
          operations
        })
      }
      setKindDraft(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      await onChanged()
      setSplitCard(null)
      notify(chosen ? t('engineering.opParts.assigned') : t('engineering.opParts.cleared'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error')
      notify(message === 'OPERATION_NAME_EXISTS_ON_TARGET' ? t('operations.moveDuplicate') : message, true)
    } finally {
      setBusyPartId('')
    }
  }

  async function chooseShared(part: IplStationPart, stationKey: string, copyIndex: number) {
    const key = rowKey(part.partId, copyIndex)
    setDistribution(prev => ({ ...prev, [key]: 'shared' }))
    const parent = parentForStation(parentGroups, stationKey)
    if (!hasSplitAssignments(parent, part.partId, copyIndex)) return
    const model = selectedModel ?? models.find(item => openTabs.includes(item.name)) ?? null
    if (!canManage || !model || !parent) return
    setBusyPartId(key)
    try {
      const operations = parent.workers.flatMap(worker => worker.operations)
      for (const group of partNumberGroups(part)) {
        await assignIplPartToWorkerLine({
          part,
          workerStationId: null,
          parentModelId: model.id,
          operationType: selectedModel ? selectedModel.name : 'common',
          copyIndex,
          partNumberKey: group.partNumber,
          operations
        })
      }
      await onChanged()
      notify(t('engineering.opParts.cleared'))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error')
      notify(message, true)
    } finally {
      setBusyPartId('')
    }
  }

  return (
    <>
    <div className="space-y-4">
      <div className="card-industrial sticky top-0 z-30 !bg-slate-950 p-3 shadow-lg shadow-black/30">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
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
          <label className="block">
            <span className="sr-only">{t('bom.filterStation')}</span>
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
        <div className="mt-2">
          <IplModelTabsBar
            compact
            models={assignableModels}
            allModels={models}
            openTabs={openTabs}
            onToggleModel={toggleModel}
            onToggleFamily={toggleFamily}
          />
        </div>
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
                        <th className="p-3 text-start">{t('engineering.opParts.model')}</th>
                        <th className="p-3 text-start">{t('operations.cols.partNumber')}</th>
                        <th className="p-3 text-center">{t('operations.cols.partQty')}</th>
                        <th className="p-3 text-start">{t('engineering.opParts.kind')}</th>
                        <th className="p-3 text-start">{t('engineering.opParts.worker')}</th>
                        <th className="p-3 text-start">{t('engineering.opParts.copy')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.flatMap(part => {
                        const copies = copyIndexesFor(parent, part.partId, draftCopies[part.partId] ?? [])
                        return copies.map(copyIndex => {
                        const assigned = assignmentFor(parent, part.partId, copyIndex)
                        const key = rowKey(part.partId, copyIndex)
                        const kind = kindDraft[key] ?? assigned.kind
                        const busy = busyPartId === key
                        const numbersDiffer = !modelsShare(part, 'partNumber')
                        const mode = !numbersDiffer
                          ? 'shared'
                          : (distribution[key] ?? (hasSplitAssignments(parent, part.partId, copyIndex) ? 'split' : 'shared'))
                        const sharedNumber = part.models[0]?.partNumber || part.partNumber
                        return (
                          <tr key={key} className="border-b border-slate-800/60">
                            <td className="p-3 font-bold text-slate-100">{part.partName}</td>
                            <td className="p-3 text-xs text-slate-400">
                              {part.models.length === 0 ? '—' : t('engineering.opParts.modelsCount', { n: part.models.length })}
                            </td>
                            <td className="p-3">
                              {numbersDiffer ? (
                                <div className="space-y-2">
                                  <span className="inline-block rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-200">
                                    {t('bom.iplComparePartNumberDifferent')}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      disabled={!canManage || busy}
                                      onClick={() => void chooseShared(part, stationKey, copyIndex)}
                                      className={`rounded-lg px-2 py-1 text-[11px] font-black ring-1 ${
                                        mode === 'shared'
                                          ? 'bg-cyan-500/20 text-cyan-100 ring-cyan-400/40'
                                          : 'bg-slate-800 text-slate-300 ring-slate-700'
                                      }`}
                                    >
                                      {t('engineering.opParts.shared')}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canManage || busy}
                                      onClick={() => openSplitCard(part, stationKey, copyIndex, kind)}
                                      className={`rounded-lg px-2 py-1 text-[11px] font-black ring-1 ${
                                        mode === 'split'
                                          ? 'bg-amber-500/20 text-amber-100 ring-amber-400/40'
                                          : 'bg-slate-800 text-slate-300 ring-slate-700'
                                      }`}
                                    >
                                      {t('engineering.opParts.split')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="block font-mono text-cyan-200" dir="ltr">
                                    {sharedNumber}
                                  </span>
                                  <span className="inline-block rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                                    {t('bom.iplComparePartNumberShared')}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono" dir="ltr">
                              {modelsShare(part, 'quantity')
                                ? (part.models[0]?.quantity ?? part.quantity)
                                : t('bom.iplCompareQtyDifferent')}
                            </td>
                            <td className="p-3">
                              <select
                                className="input-industrial w-full"
                                value={kind}
                                disabled={!canManage || busy}
                                onChange={event => {
                                  const nextKind = event.target.value
                                  setKindDraft(prev => ({ ...prev, [key]: nextKind }))
                                  if (assigned.workerId) void save(part, stationKey, assigned.workerId, nextKind, copyIndex)
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
                              {mode === 'split' ? (
                                <button
                                  type="button"
                                  disabled={!canManage || busy}
                                  onClick={() => openSplitCard(part, stationKey, copyIndex, kind)}
                                  className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-black text-amber-100 ring-1 ring-amber-400/30 hover:bg-amber-500/25 disabled:opacity-40"
                                >
                                  {t('engineering.opParts.assignNumbers')}
                                </button>
                              ) : (
                              <select
                                className="input-industrial w-full"
                                value={assigned.workerId}
                                disabled={!canManage || busy}
                                onChange={event => void save(part, stationKey, event.target.value, kind, copyIndex)}
                              >
                                <option value="">{t('operations.lineUnassigned')}</option>
                                {parent.workers.map(worker => (
                                  <option key={worker.stationId} value={worker.stationId}>
                                    {workerLabel(worker)}
                                  </option>
                                ))}
                              </select>
                              )}
                            </td>
                            <td className="p-3">
                              {canManage ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
                                  onClick={() => duplicatePart(part.partId, stationKey)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  {t('engineering.opParts.copy')}
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        )
                        })
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
    {splitCard ? (
      <Modal
        open
        title={splitCard.part.partName}
        subtitle={t('engineering.opParts.splitCardHint')}
        onClose={() => setSplitCard(null)}
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSplitCard(null)}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busyPartId !== ''}
              onClick={() => void saveSplitCard()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-40"
            >
              {t('common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-400">{t('engineering.opParts.kind')}</span>
            <select
              className="input-industrial w-full"
              value={splitCard.kind}
              onChange={event => setSplitCard(current => (current ? { ...current, kind: event.target.value } : current))}
            >
              <option value="">{t('engineering.opParts.pickKind')}</option>
              {IPL_OPERATION_KINDS.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {partNumberGroups(splitCard.part).map(group => (
            <div key={group.partNumber} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-black text-cyan-200" dir="ltr">
                  {group.partNumber}
                </span>
                <span className="font-mono text-xs text-slate-400" dir="ltr">
                  {group.quantity > 0 ? `×${group.quantity}` : t('bom.iplCompareQtyDifferent')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {group.models.map(modelName => (
                  <span
                    key={modelName}
                    className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-100"
                    dir="ltr"
                  >
                    {modelName}
                  </span>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-bold text-slate-400">{t('engineering.opParts.worker')}</span>
                <select
                  className="input-industrial w-full"
                  value={splitCard.workers[group.partNumber] ?? ''}
                  onChange={event =>
                    setSplitCard(current =>
                      current
                        ? {
                            ...current,
                            workers: { ...current.workers, [group.partNumber]: event.target.value }
                          }
                        : current
                    )
                  }
                >
                  <option value="">{t('operations.lineUnassigned')}</option>
                  {(parentForStation(parentGroups, splitCard.stationKey)?.workers ?? []).map(worker => (
                    <option key={worker.stationId} value={worker.stationId}>
                      {workerLabel(worker)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </Modal>
    ) : null}
    </>
  )
}
