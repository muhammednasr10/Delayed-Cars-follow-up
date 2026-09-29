import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, ClipboardList, Settings2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { VehicleModel } from '../../Types/settings'
import { Field, inputCls } from '../FormField'
import { Modal } from '../Modal'
import { ANNUAL_PLAN_MONTH, saveModelPlanTargets } from '../../services/modelProductionPlanService'
import { getProductionPlanWorkDays, saveProductionPlanWorkDays } from '../../services/productionPlanWorkDaysService'
import { computeTaktMinutes, formatTaktMinutes } from '../../Utils/productionLineRate'
import {
  bundlesFromGroupMap,
  normalizeGroupMap,
  overlayPlanBundles,
  readPlanBundles,
  storedQtyForModel,
  writePlanBundles
} from '../../Utils/planBundles'
import { buildPlanSections } from '../../Utils/productionPlanSummary'
import { childIdsOf, sumVisibleParentQty } from '../../Utils/planParentQty'
import { cloneTargetMap, collectTargetRows, setFamilyTarget, setFamilyWip } from '../../Utils/planTargetDraft'
import { ParentPlanBoard } from './ParentPlanBoard'

export type PlanEntryMode = 'annual' | 'monthly'

type Props = {
  open: boolean
  onClose: () => void
  entryMode: PlanEntryMode
  monthLabel: string
  planYear: number
  planMonth: number
  models: VehicleModel[]
  planTargets: Map<string, number>
  wipCarryover: Map<string, number>
  achievedByModelId: Map<string, number>
  availableDays: number
  availableHours: number
  lineJph: number
  canManage: boolean
  onSaved: () => void
}

function cloneMap(map: Map<string, number>): Map<string, number> {
  return cloneTargetMap(map)
}

export function ProductionPlanEntryModal({
  open,
  onClose,
  entryMode,
  monthLabel,
  planYear,
  planMonth,
  models,
  planTargets,
  wipCarryover,
  achievedByModelId,
  availableDays,
  availableHours,
  lineJph,
  canManage,
  onSaved
}: Props) {
  const { t } = useLang()
  const isAnnual = entryMode === 'annual'
  const saveMonth = isAnnual ? ANNUAL_PLAN_MONTH : planMonth

  const [draftTargets, setDraftTargets] = useState(() => cloneMap(planTargets))
  const [draftWip, setDraftWip] = useState(() => cloneMap(wipCarryover))
  const [draftDays, setDraftDays] = useState(availableDays)
  const [draftHours, setDraftHours] = useState(availableHours)
  const [draftJph, setDraftJph] = useState(lineJph)
  const [draftGroups, setDraftGroups] = useState<Map<string, string>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [togetherQty, setTogetherQty] = useState('')
  const [togetherWip, setTogetherWip] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parents = useMemo(
    () =>
      models
        .filter(m => m.is_active && m.model_kind === 'family')
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [models]
  )

  useEffect(() => {
    if (!open) return
    const initialTargets = cloneMap(planTargets)
    const initialWip = cloneMap(wipCarryover)
    const painted = overlayPlanBundles(initialTargets, initialWip, readPlanBundles(planYear, saveMonth))
    setDraftTargets(painted.targets)
    setDraftWip(painted.wip)
    setDraftGroups(painted.groups)
    setDraftDays(availableDays)
    setDraftHours(availableHours)
    setDraftJph(lineJph)
    setSelected(new Set())
    setTogetherQty('')
    setTogetherWip('')
    setError('')
  }, [open, planTargets, wipCarryover, availableDays, availableHours, lineJph, models, planYear, saveMonth])

  const draftSections = useMemo(
    () => buildPlanSections(models, draftTargets, achievedByModelId, draftWip),
    [models, draftTargets, achievedByModelId, draftWip]
  )

  const draftPlannedTotal = useMemo(
    () => sumVisibleParentQty(parents, draftGroups, models, draftTargets),
    [parents, draftGroups, models, draftTargets]
  )

  const draftWipTotal = useMemo(
    () => sumVisibleParentQty(parents, draftGroups, models, draftWip),
    [parents, draftGroups, models, draftWip]
  )

  const taktMinutes = useMemo(() => computeTaktMinutes(draftJph > 0 ? draftJph : null), [draftJph])

  function memberIds(groupId: string) {
    return [...draftGroups.entries()].filter(([, id]) => id === groupId).map(([id]) => id)
  }

  function setQtyOn(ids: string[], quantity: number) {
    setDraftTargets(prev => {
      let next = prev
      for (const id of ids) next = setFamilyTarget(next, id, childIdsOf(models, id), quantity)
      return next
    })
  }

  function setWipOn(ids: string[], quantity: number) {
    setDraftWip(prev => {
      let next = prev
      for (const id of ids) next = setFamilyWip(next, id, childIdsOf(models, id), quantity)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setTogetherQty('')
    setTogetherWip('')
  }

  function applyIndividualQty(id: string, quantity: number) {
    const groupId = draftGroups.get(id)
    const ids = groupId ? memberIds(groupId) : [id]
    if (ids.length >= 2) {
      setQtyOn(ids, quantity)
      return
    }
    setQtyOn([id], quantity)
    setDraftGroups(prev => {
      const next = new Map(prev)
      next.delete(id)
      return normalizeGroupMap(next)
    })
  }

  function applyIndividualWip(id: string, quantity: number) {
    const groupId = draftGroups.get(id)
    const ids = groupId ? memberIds(groupId) : [id]
    if (ids.length >= 2) {
      setWipOn(ids, quantity)
      return
    }
    setWipOn([id], quantity)
  }

  function separateModel(id: string) {
    setQtyOn([id], 0)
    setWipOn([id], 0)
    setDraftGroups(prev => {
      const next = new Map(prev)
      next.delete(id)
      return normalizeGroupMap(next)
    })
    setSelected(new Set())
  }

  function applyTogether() {
    const ids = [...selected]
    if (ids.length < 2) return
    const qty = Math.max(0, Math.round(Number(togetherQty) || 0))
    const wipQty = Math.max(0, Math.round(Number(togetherWip) || 0))
    const groupId = crypto.randomUUID()
    setQtyOn(ids, qty)
    setWipOn(ids, wipQty)
    setDraftGroups(prev => {
      const next = new Map(prev)
      for (const id of ids) next.set(id, groupId)
      return normalizeGroupMap(next)
    })
    setSelected(new Set())
    setTogetherQty('')
    setTogetherWip('')
  }

  async function handleSave() {
    if (!canManage) return
    setSaving(true)
    setError('')
    try {
      if (!isAnnual) {
        const existing = await getProductionPlanWorkDays(planYear, planMonth)
        await saveProductionPlanWorkDays({
          year: planYear,
          month: planMonth,
          workingDays: existing?.workingDays ?? 0,
          vacationDays: existing?.vacationDays ?? 0,
          overtimeDays: existing?.overtimeDays ?? 0,
          availableDays: Math.max(0, Math.round(draftDays)),
          availableHours: Math.max(0, draftHours),
          lineJph: Math.max(0, draftJph)
        })
      }
      let targets = draftTargets
      let wip = draftWip
      for (const parent of parents) {
        const children = childIdsOf(models, parent.id)
        if ((targets.get(parent.id) ?? 0) <= 0) {
          const sum = children.reduce((total, vid) => total + (targets.get(vid) ?? 0), 0)
          if (sum > 0) targets = setFamilyTarget(targets, parent.id, children, sum)
        }
        if (!isAnnual && (wip.get(parent.id) ?? 0) <= 0) {
          const sum = children.reduce((total, vid) => total + (wip.get(vid) ?? 0), 0)
          if (sum > 0) wip = setFamilyWip(wip, parent.id, children, sum)
        }
      }
      writePlanBundles(planYear, saveMonth, bundlesFromGroupMap(draftGroups, targets, wip))
      const rows = collectTargetRows(draftSections, targets, wip, !isAnnual)
      const seen = new Set(rows.map(row => row.modelId))
      for (const parent of parents) {
        if (seen.has(parent.id)) continue
        const targetQty = storedQtyForModel(parent.id, Math.max(0, targets.get(parent.id) ?? 0), draftGroups)
        const wipQty = !isAnnual
          ? storedQtyForModel(parent.id, Math.max(0, wip.get(parent.id) ?? 0), draftGroups)
          : 0
        const hadBefore = (planTargets.get(parent.id) ?? 0) > 0 || (wipCarryover.get(parent.id) ?? 0) > 0
        if (targetQty <= 0 && wipQty <= 0 && !hadBefore) continue
        rows.push({ modelId: parent.id, targetQty, wipCarryover: wipQty })
      }
      await saveModelPlanTargets(
        rows.map(r => ({
          modelId: r.modelId,
          targetQty: storedQtyForModel(r.modelId, r.targetQty, draftGroups),
          planYear,
          planMonth: saveMonth,
          wipCarryover: storedQtyForModel(r.modelId, r.wipCarryover, draftGroups)
        }))
      )
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const title = isAnnual ? t('productionOrders.planEntry.annualTitle') : t('productionOrders.planEntry.title')
  const subtitle = isAnnual
    ? t('productionOrders.planEntry.annualSubtitle', { year: planYear })
    : t('productionOrders.planEntry.subtitle', { month: monthLabel })

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      icon={isAnnual ? <CalendarRange className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-200"
          >
            {t('common.cancel')}
          </button>
          {canManage && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('productionOrders.savePlan')}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        {!isAnnual && (
          <section className="rounded-2xl border border-slate-700/60 bg-slate-950/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-emerald-300" />
              <h4 className="text-sm font-black text-emerald-200">
                {t('productionOrders.planEntry.requirementsTitle')}
              </h4>
            </div>
            <p className="mb-4 text-xs text-slate-500">{t('productionOrders.planEntry.requirementsHint')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('productionOrders.workDays.available')}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  disabled={!canManage}
                  className={inputCls()}
                  value={draftDays || ''}
                  onChange={e => setDraftDays(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                />
              </Field>
              <Field label={t('productionOrders.workDays.availableHours')}>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={!canManage}
                  className={inputCls()}
                  value={draftHours || ''}
                  onChange={e => setDraftHours(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
              <Field label={t('productionOrders.jph')}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  disabled={!canManage}
                  className={inputCls()}
                  value={draftJph || ''}
                  onChange={e => setDraftJph(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
              <Field label={t('productionOrders.taktTime')}>
                <input
                  className={`${inputCls()} font-black text-amber-300`}
                  readOnly
                  value={taktMinutes != null ? formatTaktMinutes(taktMinutes) : '—'}
                />
              </Field>
            </div>
          </section>
        )}

        {isAnnual && (
          <p className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">
            {t('productionOrders.planEntry.annualHint')}
          </p>
        )}

        <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-violet-200">
                {isAnnual
                  ? t('productionOrders.planEntry.annualTargetsTitle')
                  : t('productionOrders.planEntry.targetsTitle')}
              </h4>
              <p className="mt-1 text-xs text-slate-500">{t('productionOrders.planEntryModesHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-center">
                <p className="text-[10px] font-bold text-cyan-200/80">{t('productionOrders.plannedQty')}</p>
                <p className="text-lg font-black text-cyan-300">{draftPlannedTotal || '—'}</p>
              </div>
              {!isAnnual && draftWipTotal > 0 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold text-rose-200/80">{t('productionOrders.wipCarryover')}</p>
                  <p className="text-lg font-black text-rose-300">{draftWipTotal || '—'}</p>
                </div>
              )}
            </div>
          </div>

          <ParentPlanBoard
            parents={parents}
            models={models}
            draftTargets={draftTargets}
            draftWip={draftWip}
            draftGroups={draftGroups}
            selected={selected}
            togetherQty={togetherQty}
            togetherWip={togetherWip}
            canManage={canManage}
            showWip={!isAnnual}
            t={t}
            onToggle={toggleSelect}
            onIndividualQty={applyIndividualQty}
            onIndividualWip={applyIndividualWip}
            onSeparate={separateModel}
            onTogetherQty={setTogetherQty}
            onTogetherWip={setTogetherWip}
            onApplyTogether={applyTogether}
          />
        </section>
      </div>
    </Modal>
  )
}

