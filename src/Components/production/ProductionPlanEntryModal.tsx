import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, ChevronDown, ClipboardList, Settings2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { Modal } from '../Modal'
import { ANNUAL_PLAN_MONTH, saveModelPlanTargets } from '../../services/modelProductionPlanService'
import { getProductionPlanWorkDays, saveProductionPlanWorkDays } from '../../services/productionPlanWorkDaysService'
import { computeTaktMinutes, formatTaktMinutes } from '../../Utils/productionLineRate'
import { buildPlanSections, type PlanFamilyGroup, type PlanSection } from '../../Utils/productionPlanSummary'

export type PlanEntryMode = 'annual' | 'monthly'

type Props = {
  open: boolean
  onClose: () => void
  entryMode: PlanEntryMode
  monthLabel: string
  planYear: number
  planMonth: number
  models: import('../../Types/settings').VehicleModel[]
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
  return new Map(map)
}

function collectTargetRows(
  sections: PlanSection[],
  targets: Map<string, number>,
  wip: Map<string, number>,
  includeWip: boolean
) {
  const seen = new Set<string>()
  const rows: { modelId: string; targetQty: number; wipCarryover: number }[] = []
  for (const section of sections) {
    const group = section.group
    for (const id of [group.familyId, ...group.variants.map(v => v.modelId)]) {
      if (seen.has(id)) continue
      seen.add(id)
      rows.push({
        modelId: id,
        targetQty: Math.max(0, targets.get(id) ?? 0),
        wipCarryover: includeWip ? Math.max(0, wip.get(id) ?? 0) : 0
      })
    }
  }
  return rows
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const initialTargets = cloneMap(planTargets)
    setDraftTargets(initialTargets)
    setDraftWip(cloneMap(wipCarryover))
    setDraftDays(availableDays)
    setDraftHours(availableHours)
    setDraftJph(lineJph)
    const sections = buildPlanSections(models, initialTargets, achievedByModelId, wipCarryover)
    setExpanded(new Set(sections.map(s => s.group.key)))
    setError('')
  }, [open, planTargets, wipCarryover, availableDays, availableHours, lineJph, models, achievedByModelId])

  const draftSections = useMemo(
    () => buildPlanSections(models, draftTargets, achievedByModelId, draftWip),
    [models, draftTargets, achievedByModelId, draftWip]
  )

  const draftPlannedTotal = useMemo(
    () => draftSections.reduce((sum, s) => sum + s.group.planned, 0),
    [draftSections]
  )

  const draftWipTotal = useMemo(
    () => draftSections.reduce((sum, s) => sum + s.group.wipCarryover, 0),
    [draftSections]
  )

  const taktMinutes = useMemo(() => computeTaktMinutes(draftJph > 0 ? draftJph : null), [draftJph])

  function toggleFamily(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function setFamilyTarget(familyId: string, variantIds: string[], quantity: number) {
    const qty = Math.max(0, quantity)
    const childIds = variantIds.filter(id => id !== familyId)
    setDraftTargets(prev => {
      const next = new Map(prev)
      next.set(familyId, qty)
      for (const id of childIds) next.set(id, 0)
      return next
    })
  }

  function setVariantTarget(familyId: string, variantId: string, quantity: number) {
    const qty = Math.max(0, quantity)
    setDraftTargets(prev => {
      const next = new Map(prev)
      if (familyId !== variantId) next.set(familyId, 0)
      next.set(variantId, qty)
      return next
    })
  }

  function setFamilyWip(familyId: string, variantIds: string[], quantity: number) {
    const qty = Math.max(0, quantity)
    const childIds = variantIds.filter(id => id !== familyId)
    setDraftWip(prev => {
      const next = new Map(prev)
      next.set(familyId, qty)
      for (const id of childIds) next.delete(id)
      return next
    })
  }

  function setVariantWip(familyId: string, variantId: string, quantity: number) {
    const qty = Math.max(0, quantity)
    setDraftWip(prev => {
      const next = new Map(prev)
      if (familyId !== variantId) next.delete(familyId)
      next.set(variantId, qty)
      return next
    })
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
      const rows = collectTargetRows(draftSections, draftTargets, draftWip, !isAnnual)
      await saveModelPlanTargets(
        rows.map(r => ({
          modelId: r.modelId,
          targetQty: r.targetQty,
          planYear,
          planMonth: saveMonth,
          wipCarryover: r.wipCarryover
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

  const title = isAnnual
    ? t('productionOrders.planEntry.annualTitle')
    : t('productionOrders.planEntry.title')
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
              <h4 className="text-sm font-black text-emerald-200">{t('productionOrders.planEntry.requirementsTitle')}</h4>
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
                {isAnnual ? t('productionOrders.planEntry.annualTargetsTitle') : t('productionOrders.planEntry.targetsTitle')}
              </h4>
              <p className="mt-1 text-xs text-slate-500">{t('productionOrders.planEntryModesHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-center">
                <p className="text-[10px] font-bold text-cyan-200/80">{t('productionOrders.plannedQty')}</p>
                <p className="text-lg font-black text-cyan-300">{draftPlannedTotal || '—'}</p>
              </div>
              {!isAnnual && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold text-rose-200/80">{t('productionOrders.wipCarryover')}</p>
                  <p className="text-lg font-black text-rose-300">{draftWipTotal || '—'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {draftSections.map(section => (
              <FamilyPlanBlock
                key={section.group.key}
                group={section.group}
                canManage={canManage}
                isExpanded={expanded.has(section.group.key)}
                showWip={!isAnnual}
                onToggle={() => toggleFamily(section.group.key)}
                onSetFamily={setFamilyTarget}
                onSetVariant={setVariantTarget}
                onSetFamilyWip={setFamilyWip}
                onSetVariantWip={setVariantWip}
                t={t}
              />
            ))}
            {draftSections.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">{t('productivity.monthly.noModels')}</p>
            )}
          </div>
        </section>
      </div>
    </Modal>
  )
}

function FamilyPlanBlock({
  group,
  canManage,
  isExpanded,
  showWip,
  onToggle,
  onSetFamily,
  onSetVariant,
  onSetFamilyWip,
  onSetVariantWip,
  t
}: {
  group: PlanFamilyGroup
  canManage: boolean
  isExpanded: boolean
  showWip: boolean
  onToggle: () => void
  onSetFamily: (familyId: string, variantIds: string[], quantity: number) => void
  onSetVariant: (familyId: string, variantId: string, quantity: number) => void
  onSetFamilyWip: (familyId: string, variantIds: string[], quantity: number) => void
  onSetVariantWip: (familyId: string, variantId: string, quantity: number) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const variantIds = group.variants.map(v => v.modelId)
  const familyIsLeaf = variantIds.length === 1 && variantIds[0] === group.familyId
  const familyPlanned =
    group.entryMode === 'family_aggregate' ? group.planned : group.entryMode === 'flexible' ? 0 : 0
  const familyWip =
    group.entryMode === 'family_aggregate'
      ? group.wipCarryover
      : group.entryMode === 'per_variant'
        ? 0
        : 0
  const modeLabel =
    group.entryMode === 'family_aggregate'
      ? t('productionOrders.planModeFamily')
      : group.entryMode === 'per_variant'
        ? t('productionOrders.planModeVariants')
        : t('productionOrders.planModeFlexible')

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={familyIsLeaf}
          className="inline-flex min-w-0 flex-1 items-center gap-2 text-start disabled:cursor-default"
          aria-expanded={isExpanded}
        >
          {!familyIsLeaf && (
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-violet-300 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          )}
          <span className="font-black text-white">{group.label}</span>
          <span className="text-xs text-violet-300/70">({group.variants.length})</span>
          <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
            {modeLabel}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <QtyField
            label={t('productionOrders.plannedQty')}
            value={familyIsLeaf ? group.planned : familyPlanned}
            canEdit={
              canManage &&
              (familyIsLeaf || (group.entryMode !== 'per_variant' && !familyIsLeaf))
            }
            onChange={v =>
              familyIsLeaf
                ? onSetVariant(group.familyId, group.familyId, v)
                : onSetFamily(group.familyId, variantIds, v)
            }
            displayValue={
              !familyIsLeaf && group.entryMode === 'per_variant' ? '—' : undefined
            }
            tone="cyan"
          />
          {showWip && (
            <QtyField
              label={t('productionOrders.wipCarryoverShort')}
              value={familyWip}
              canEdit={canManage && (familyIsLeaf || group.entryMode === 'family_aggregate')}
              onChange={v =>
                familyIsLeaf
                  ? onSetVariantWip(group.familyId, group.familyId, v)
                  : onSetFamilyWip(group.familyId, variantIds, v)
              }
              displayValue={
                !familyIsLeaf && group.entryMode === 'per_variant' ? '—' : undefined
              }
              tone="rose"
            />
          )}
        </div>
      </div>

      {isExpanded && !familyIsLeaf && (
        <div className="border-t border-slate-800/80 bg-slate-950/40 px-3 py-2">
          {group.variants.map(variant => {
            const showVariantInput = group.entryMode !== 'family_aggregate'
            return (
              <div
                key={variant.modelId}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/50 py-2 last:border-0"
              >
                <span className="text-sm font-bold text-slate-300">
                  <span className="text-slate-600">— </span>
                  {variant.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {showVariantInput ? (
                    <QtyField
                      label={t('productionOrders.plannedQty')}
                      value={variant.planned}
                      canEdit={canManage}
                      onChange={v => onSetVariant(group.familyId, variant.modelId, v)}
                      tone="cyan"
                      compact
                    />
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                  {showWip && showVariantInput && (
                    <QtyField
                      label={t('productionOrders.wipCarryoverShort')}
                      value={variant.wipCarryover}
                      canEdit={canManage}
                      onChange={v => onSetVariantWip(group.familyId, variant.modelId, v)}
                      tone="rose"
                      compact
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QtyField({
  label,
  value,
  canEdit,
  onChange,
  displayValue,
  tone,
  compact = false
}: {
  label: string
  value: number
  canEdit: boolean
  onChange: (n: number) => void
  displayValue?: string
  tone: 'cyan' | 'rose'
  compact?: boolean
}) {
  const border = tone === 'cyan' ? 'border-violet-600/50 text-cyan-300' : 'border-rose-600/40 text-rose-300'
  const shown = displayValue ?? (value || '—')

  if (!canEdit) {
    return (
      <div className={compact ? 'text-center' : ''}>
        {!compact && <p className="text-[10px] font-bold text-slate-500">{label}</p>}
        <span className={`font-black ${tone === 'cyan' ? 'text-cyan-300' : 'text-rose-300'}`}>{shown}</span>
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'text-center'}>
      {!compact && <p className="text-[10px] font-bold text-slate-500">{label}</p>}
      <input
        type="number"
        min={0}
        className={`w-20 rounded-lg border bg-slate-950 px-2 py-1.5 text-center text-sm font-black ${border}`}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        title={label}
      />
    </div>
  )
}
