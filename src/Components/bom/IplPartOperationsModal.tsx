import { useEffect, useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { getParentStationOperationsGroups } from '../../services/stationOperationsService'
import { getVehicleModels } from '../../services/settingsService'
import type { VehicleModel } from '../../Types/settings'
import type { ParentStationOperationsGroup } from '../../Types/timeStudy'
import { IPL_OPERATION_KINDS } from '../../Utils/iplOperationKind'
import type { IplCompareRow } from '../../Utils/iplModelCompare'
import { iplStationKey } from '../../Utils/iplStationParts'
import {
  emptyIplPartOpSlot,
  fittedModelsForPartOps,
  homeStationKey,
  IPL_PART_OPS_MAX,
  modelGroupsOf,
  readLinkedHardwareForPart,
  readStoredIplPartAssignments,
  slotsForPartNumber,
  stationChoices,
  workersForStation,
  type IplPartOpSlot,
  type LinkedHardwarePartRef
} from '../../Utils/iplPartOperationsModel'
import { saveIplPartOperations } from '../../hooks/useIplPartOperationsSave'
import { Modal } from '../Modal'
import { IplHardwareLinkField } from './IplHardwareLinkField'
import { partIdFromCompareRow } from './IplComparePartCard'

type Props = {
  open: boolean
  row: IplCompareRow | null
  models: string[]
  canUpdate?: boolean
  onClose: () => void
}

export function IplPartOperationsModal({ open, row, models, canUpdate, onClose }: Props) {
  const { t } = useLang()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [groups, setGroups] = useState<ParentStationOperationsGroup[]>([])
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([])
  const [multi, setMulti] = useState(false)
  const [byModel, setByModel] = useState(false)
  const [countText, setCountText] = useState('2')
  const [rows, setRows] = useState<IplPartOpSlot[]>([])
  const [groupRows, setGroupRows] = useState<Record<string, IplPartOpSlot[]>>({})
  const [linkHardware, setLinkHardware] = useState(false)
  const [linkedHardware, setLinkedHardware] = useState<LinkedHardwarePartRef[]>([])

  useEffect(() => {
    if (!open || !row) return
    let cancelled = false
    setLoading(true)
    setError('')
    setMulti(false)
    setByModel(false)
    setCountText('2')
    setRows([])
    setGroupRows({})
    setLinkHardware(false)
    setLinkedHardware([])
    const partId = partIdFromCompareRow(row)
    Promise.all([getParentStationOperationsGroups(), getVehicleModels()])
      .then(([nextGroups, nextModels]) => {
        if (cancelled) return
        setGroups(nextGroups)
        setVehicleModels(nextModels)
        const stored = partId ? readStoredIplPartAssignments(nextGroups, partId) : []
        const linked = partId ? readLinkedHardwareForPart(nextGroups, partId) : []
        setLinkedHardware(linked)
        setLinkHardware(linked.length > 0)
        const home = homeStationKey(row, models)
        const numbered = stored.filter(item => item.partNumber)
        if (numbered.length > 0) {
          const next: Record<string, IplPartOpSlot[]> = {}
          for (const group of modelGroupsOf(row, models)) {
            next[group.partNumber] = slotsForPartNumber(stored, group.partNumber, group.stationKey)
          }
          setByModel(true)
          setGroupRows(next)
          if (Object.values(next).some(slots => slots.length > 1)) setMulti(true)
        }
        const shared = slotsForPartNumber(stored, '', home)
        if (shared.length > 1 && shared.some(slot => slot.workerId)) {
          setMulti(true)
          setCountText(String(shared.length))
          setRows(shared)
        } else {
          const slot = shared[0] ?? emptyIplPartOpSlot(home)
          const onHome = !slot.workerId || !home || slot.stationKey === home
          setRows([{ ...slot, stationKey: home || slot.stationKey, workerId: onHome ? slot.workerId : '' }])
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, row, models, t])

  const fitted = useMemo(() => (row ? fittedModelsForPartOps(row, models) : []), [models, row])
  const modelGroups = useMemo(() => (row ? modelGroupsOf(row, models) : []), [models, row])
  const homeKey = useMemo(() => (row ? homeStationKey(row, models) : ''), [models, row])
  const stations = useMemo(() => stationChoices(groups), [groups])
  const count = Math.min(IPL_PART_OPS_MAX, Math.max(0, Number.parseInt(countText, 10) || 0))
  const homeLabel =
    stations.find(station => station.key === homeKey)?.label ||
    fitted.find(entry => iplStationKey(entry.item.station_code_text || entry.item.station_number || '') === homeKey)?.station ||
    homeKey ||
    '—'

  function workersOn(stationKey: string) {
    return workersForStation(groups, stationKey)
  }

  function enableByModel(checked: boolean) {
    setByModel(checked)
    if (!checked) return
    setGroupRows(current => {
      const next = { ...current }
      for (const group of modelGroups) {
        if (!next[group.partNumber]?.length) next[group.partNumber] = [emptyIplPartOpSlot(group.stationKey)]
      }
      return next
    })
  }

  function updateGroupRow(partNumber: string, index: number, patch: Partial<IplPartOpSlot>) {
    setGroupRows(current => {
      const slots = current[partNumber] ?? []
      return {
        ...current,
        [partNumber]: slots.map((slot, slotIndex) => {
          if (slotIndex !== index) return slot
          const next = { ...slot, ...patch }
          if (patch.stationKey && patch.stationKey !== slot.stationKey) {
            const stillThere = workersOn(patch.stationKey).some(worker => worker.stationId === next.workerId)
            if (!stillThere) next.workerId = ''
          }
          return next
        })
      }
    })
  }

  function changeGroupCount(partNumber: string, value: string, stationKey: string) {
    const nextCount = Math.min(IPL_PART_OPS_MAX, Math.max(0, Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0))
    setGroupRows(current => ({
      ...current,
      [partNumber]: Array.from({ length: nextCount }, (_, index) => current[partNumber]?.[index] ?? emptyIplPartOpSlot(stationKey))
    }))
  }

  function enableMulti(checked: boolean) {
    setMulti(checked)
    if (!checked) {
      setRows(current => {
        const first = current[0] ?? emptyIplPartOpSlot(homeKey)
        const kept = workersOn(homeKey).some(worker => worker.stationId === first.workerId)
        return [{ ...first, stationKey: homeKey, workerId: kept ? first.workerId : '' }]
      })
      return
    }
    setRows(current => {
      const nextCount = Math.min(IPL_PART_OPS_MAX, Math.max(2, Number.parseInt(countText, 10) || 2))
      return Array.from({ length: nextCount }, (_, index) => current[index] ?? emptyIplPartOpSlot(homeKey))
    })
    setGroupRows(current => {
      const next = { ...current }
      const nextCount = Math.min(IPL_PART_OPS_MAX, Math.max(2, Number.parseInt(countText, 10) || 2))
      for (const group of modelGroups) {
        const existing = next[group.partNumber] ?? [emptyIplPartOpSlot(group.stationKey)]
        next[group.partNumber] = Array.from({ length: Math.max(existing.length, nextCount) }, (_, index) => existing[index] ?? emptyIplPartOpSlot(group.stationKey))
      }
      return next
    })
  }

  function changeCount(value: string) {
    const digits = value.replace(/[^\d]/g, '').slice(0, 2)
    setCountText(digits)
    const nextCount = Math.min(IPL_PART_OPS_MAX, Math.max(0, Number.parseInt(digits, 10) || 0))
    setRows(current => Array.from({ length: nextCount }, (_, index) => current[index] ?? emptyIplPartOpSlot(homeKey)))
  }

  function updateRow(index: number, patch: Partial<IplPartOpSlot>) {
    setRows(current =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot
        const next = { ...slot, ...patch }
        if (patch.stationKey && patch.stationKey !== slot.stationKey) {
          const stillThere = workersOn(patch.stationKey).some(worker => worker.stationId === next.workerId)
          if (!stillThere) next.workerId = ''
        }
        return next
      })
    )
  }

  async function save() {
    if (!row || !canUpdate) return
    setSaving(true)
    setError('')
    try {
      const message = await saveIplPartOperations({
        row,
        models,
        groups,
        vehicleModels,
        multi,
        byModel,
        homeKey,
        rows,
        groupRows,
        modelGroups,
        fittedModelNames: fitted.map(entry => entry.model),
        linkHardware,
        linkedHardware,
        t
      })
      if (message) {
        setError(message)
        return
      }
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const visibleRows = multi ? rows : [rows[0] ?? emptyIplPartOpSlot(homeKey)]

  return (
    <Modal
      open={open && row != null}
      title={row?.partNameAr || t('bom.partOps.title')}
      subtitle={row?.partNameEn && row.partNameEn !== '—' ? row.partNameEn : t('bom.partOps.title')}
      icon={<ListChecks className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        canUpdate ? (
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving || loading}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-40"
              onClick={() => void save()}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4">
          {error ? <p className="text-sm font-bold text-rose-300">{error}</p> : null}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase text-cyan-300">{t('bom.iplPartCardModels')}</p>
            {fitted.length === 0 ? (
              <p className="text-sm text-slate-400">{t('bom.partOps.noFitted')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fitted.map(entry => (
                  <div key={entry.model} className="min-w-[8rem] rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <div className="text-xs font-black text-violet-100" dir="ltr">
                      {entry.model}
                    </div>
                    <div className="font-mono text-[11px] text-cyan-200" dir="ltr">
                      {entry.partNumber || t('bom.partNumberUnset')}
                    </div>
                    <div className="text-[10px] text-slate-400" dir="ltr">
                      {entry.station} · ×{entry.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <input
              type="checkbox"
              className="h-4 w-4 accent-cyan-400"
              checked={byModel}
              disabled={!canUpdate || modelGroups.length === 0}
              onChange={event => enableByModel(event.target.checked)}
            />
            {t('bom.partOps.byModelAsk')}
          </label>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <input
              type="checkbox"
              className="h-4 w-4 accent-cyan-400"
              checked={multi}
              disabled={!canUpdate}
              onChange={event => enableMulti(event.target.checked)}
            />
            {t('bom.partOps.multiAsk')}
          </label>

          <IplHardwareLinkField
            enabled={linkHardware}
            selected={linkedHardware}
            disabled={!canUpdate}
            onEnabledChange={setLinkHardware}
            onChange={setLinkedHardware}
          />

          <div className="space-y-3">
            {byModel ? (
              <p className="text-xs text-slate-400">{t('bom.partOps.byModelHint')}</p>
            ) : multi ? (
              <label className="block max-w-[12rem]">
                <span className="mb-1 block text-xs font-bold text-slate-400">{t('bom.partOps.count')}</span>
                <input
                  className="input-industrial w-full"
                  inputMode="numeric"
                  value={countText}
                  disabled={!canUpdate}
                  onChange={event => changeCount(event.target.value)}
                />
              </label>
            ) : (
              <p className="text-xs text-slate-400">{t('bom.partOps.singleHint')}</p>
            )}
            {!byModel && multi && count < 2 ? <p className="text-xs text-amber-200">{t('bom.partOps.needCount')}</p> : null}
            {byModel ? (
              <div className="space-y-3">
                {modelGroups.map(group => {
                  const storedSlots = groupRows[group.partNumber] ?? [emptyIplPartOpSlot(group.stationKey)]
                  const slots = multi ? storedSlots : [storedSlots[0] ?? emptyIplPartOpSlot(group.stationKey)]
                  const lockedLabel = stations.find(station => station.key === group.stationKey)?.label || group.stationLabel
                  return (
                    <section
                      key={group.partNumber || `__unset__${group.stationKey}`}
                      className="space-y-2 rounded-xl border border-violet-400/30 bg-violet-500/5 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-xs font-black text-cyan-200" dir="ltr">
                          {group.partNumber || t('bom.partNumberUnset')}
                        </span>
                        {group.models.map(modelName => (
                          <span
                            key={modelName}
                            className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-100"
                            dir="ltr"
                          >
                            {modelName}
                          </span>
                        ))}
                      </div>
                      {multi ? (
                        <label className="block max-w-[12rem]">
                          <span className="mb-1 block text-xs font-bold text-slate-400">{t('bom.partOps.count')}</span>
                          <input
                            className="input-industrial w-full"
                            inputMode="numeric"
                            value={String(storedSlots.length)}
                            disabled={!canUpdate}
                            onChange={event => changeGroupCount(group.partNumber, event.target.value, group.stationKey)}
                          />
                        </label>
                      ) : null}
                      {slots.map((slot, index) => {
                        const stationKey = multi ? slot.stationKey || group.stationKey : group.stationKey
                        const stationWorkers = workersOn(stationKey)
                        return (
                          <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                            <p className="mb-2 text-xs font-black text-slate-200">
                              {t('bom.partOps.operationN', { n: multi ? index + 1 : 1 })}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.station')}</span>
                                {multi ? (
                                  <select
                                    className="input-industrial w-full"
                                    value={slot.stationKey}
                                    disabled={!canUpdate}
                                    onChange={event => updateGroupRow(group.partNumber, index, { stationKey: event.target.value })}
                                  >
                                    <option value="">{t('bom.partOps.pickStation')}</option>
                                    {stations.map(station => (
                                      <option key={station.key} value={station.key}>
                                        {station.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200" dir="ltr">
                                    {lockedLabel}
                                  </p>
                                )}
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.kind')}</span>
                                <select
                                  className="input-industrial w-full"
                                  value={slot.kind}
                                  disabled={!canUpdate}
                                  onChange={event => updateGroupRow(group.partNumber, index, { kind: event.target.value })}
                                >
                                  <option value="">{t('bom.partOps.pickKind')}</option>
                                  {IPL_OPERATION_KINDS.map(kind => (
                                    <option key={kind} value={kind}>
                                      {kind}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.technician')}</span>
                                <select
                                  className="input-industrial w-full"
                                  value={slot.workerId}
                                  disabled={!canUpdate || stationWorkers.length === 0}
                                  onChange={event => updateGroupRow(group.partNumber, index, { workerId: event.target.value })}
                                >
                                  <option value="">{t('bom.partOps.pickTechnician')}</option>
                                  {stationWorkers.map(worker => (
                                    <option key={worker.stationId} value={worker.stationId}>
                                      {worker.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            {stationWorkers.length === 0 ? (
                              <p className="mt-2 text-xs text-amber-200">{t('bom.partOps.noWorkers')}</p>
                            ) : null}
                          </div>
                        )
                      })}
                    </section>
                  )
                })}
              </div>
            ) : (
            <div className="space-y-2">
              {visibleRows.map((slot, index) => {
                const stationKey = multi ? slot.stationKey : homeKey
                const stationWorkers = workersOn(stationKey)
                return (
                  <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="mb-2 text-xs font-black text-slate-200">
                      {t('bom.partOps.operationN', { n: multi ? index + 1 : 1 })}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.station')}</span>
                        {multi ? (
                          <select
                            className="input-industrial w-full"
                            value={slot.stationKey}
                            disabled={!canUpdate}
                            onChange={event => updateRow(index, { stationKey: event.target.value })}
                          >
                            <option value="">{t('bom.partOps.pickStation')}</option>
                            {stations.map(station => (
                              <option key={station.key} value={station.key}>
                                {station.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200" dir="ltr">
                            {homeLabel}
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.kind')}</span>
                        <select
                          className="input-industrial w-full"
                          value={slot.kind}
                          disabled={!canUpdate}
                          onChange={event => updateRow(index, { kind: event.target.value })}
                        >
                          <option value="">{t('bom.partOps.pickKind')}</option>
                          {IPL_OPERATION_KINDS.map(kind => (
                            <option key={kind} value={kind}>
                              {kind}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-bold text-slate-500">{t('bom.partOps.technician')}</span>
                        <select
                          className="input-industrial w-full"
                          value={slot.workerId}
                          disabled={!canUpdate || stationWorkers.length === 0}
                          onChange={event => updateRow(index, { workerId: event.target.value })}
                        >
                          <option value="">{t('bom.partOps.pickTechnician')}</option>
                          {stationWorkers.map(worker => (
                            <option key={worker.stationId} value={worker.stationId}>
                              {worker.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {stationWorkers.length === 0 ? <p className="mt-2 text-xs text-amber-200">{t('bom.partOps.noWorkers')}</p> : null}
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
