import { useEffect, useState } from 'react'
import type { VehicleModel } from '../../Types/settings'
import { inputCls } from '../FormField'
import { rolledQty } from '../../Utils/planParentQty'
import { PlanQtyField } from './PlanQtyField'

type Props = {
  parents: VehicleModel[]
  models: VehicleModel[]
  draftTargets: Map<string, number>
  draftWip: Map<string, number>
  draftGroups: Map<string, string>
  selected: Set<string>
  togetherQty: string
  togetherWip: string
  canManage: boolean
  showWip: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
  onToggle: (id: string) => void
  onIndividualQty: (id: string, quantity: number) => void
  onIndividualWip: (id: string, quantity: number) => void
  onSeparate: (id: string) => void
  onTogetherQty: (value: string) => void
  onTogetherWip: (value: string) => void
  onApplyTogether: () => void
}

export function ParentPlanBoard({
  parents,
  models,
  draftTargets,
  draftWip,
  draftGroups,
  selected,
  togetherQty,
  togetherWip,
  canManage,
  showWip,
  t,
  onToggle,
  onIndividualQty,
  onIndividualWip,
  onSeparate,
  onTogetherQty,
  onTogetherWip,
  onApplyTogether
}: Props) {
  const selectedParents = parents.filter(parent => selected.has(parent.id))
  const one = selectedParents.length === 1 ? selectedParents[0] : null
  const oneId = one?.id ?? ''
  const selectedKey = selectedParents.map(parent => parent.id).join('\0')
  const [singleWipOpen, setSingleWipOpen] = useState(false)
  const [togetherWipOpen, setTogetherWipOpen] = useState(false)

  useEffect(() => {
    if (!oneId) {
      setSingleWipOpen(false)
      return
    }
    setSingleWipOpen(rolledQty(models, oneId, draftWip) > 0)
  }, [oneId])

  useEffect(() => {
    if (selectedParents.length < 2) {
      setTogetherWipOpen(false)
      return
    }
    setTogetherWipOpen(selectedParents.some(parent => rolledQty(models, parent.id, draftWip) > 0))
  }, [selectedKey])

  if (parents.length === 0) {
    return <p className="mt-4 py-6 text-center text-sm text-slate-500">{t('productionOrders.planNoParents')}</p>
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {parents.map(parent => {
          const active = selected.has(parent.id)
          const groupId = draftGroups.get(parent.id)
          const partners = groupId
            ? parents.filter(item => item.id !== parent.id && draftGroups.get(item.id) === groupId).map(item => item.name)
            : []
          const qty = rolledQty(models, parent.id, draftTargets)
          return (
            <button
              key={parent.id}
              type="button"
              onClick={() => onToggle(parent.id)}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-start transition ${
                active
                  ? 'border-violet-400 bg-violet-500/20 ring-1 ring-violet-400/60'
                  : 'border-slate-700/80 bg-slate-900/70 hover:border-violet-500/40'
              }`}
            >
              <span className="block truncate font-black text-white">{parent.name}</span>
              <span className="mt-1 block text-xl font-black text-cyan-300">{qty || '—'}</span>
              {partners.length > 0 && (
                <span className="mt-1 block truncate text-[10px] font-bold text-violet-300">
                  {t('productionOrders.planTogetherWith', { names: partners.join('، ') })}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {one && (
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-3">
          <p className="mb-2 text-sm font-black text-white">{one.name}</p>
          {draftGroups.get(one.id) && (
            <p className="mb-2 text-[11px] font-bold text-violet-300">{t('productionOrders.planSharedEdit')}</p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <PlanQtyField
              label={t('productionOrders.plannedQty')}
              value={rolledQty(models, one.id, draftTargets)}
              canEdit={canManage}
              onChange={v => onIndividualQty(one.id, v)}
              tone="cyan"
            />
            {showWip && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-rose-400"
                    checked={singleWipOpen}
                    disabled={!canManage}
                    onChange={e => {
                      const checked = e.target.checked
                      setSingleWipOpen(checked)
                      if (!checked) onIndividualWip(one.id, 0)
                    }}
                  />
                  {t('productionOrders.wipCarryoverShort')}
                </label>
                {singleWipOpen && (
                  <PlanQtyField
                    label={t('productionOrders.wipCarryoverShort')}
                    value={rolledQty(models, one.id, draftWip)}
                    canEdit={canManage}
                    onChange={v => onIndividualWip(one.id, v)}
                    tone="rose"
                    showLabel={false}
                  />
                )}
              </div>
            )}
            {canManage && draftGroups.get(one.id) && (
              <button
                type="button"
                onClick={() => onSeparate(one.id)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-rose-300"
              >
                {t('productionOrders.planSeparate')}
              </button>
            )}
          </div>
        </div>
      )}

      {selectedParents.length >= 2 && (
        <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3">
          <p className="text-sm font-black text-violet-100">{selectedParents.map(parent => parent.name).join(' + ')}</p>
          <p className="mb-3 mt-1 text-[11px] text-violet-200/80">{t('productionOrders.planTogetherHint')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="mb-1 block text-[10px] font-bold text-slate-400">{t('productionOrders.plannedQty')}</span>
              <input
                type="number"
                min={0}
                disabled={!canManage}
                className={`${inputCls()} w-24 text-center font-black text-cyan-300`}
                value={togetherQty}
                onChange={e => onTogetherQty(e.target.value)}
              />
            </label>
            {showWip && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-100">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-rose-400"
                    checked={togetherWipOpen}
                    disabled={!canManage}
                    onChange={e => {
                      const checked = e.target.checked
                      setTogetherWipOpen(checked)
                      if (!checked) onTogetherWip('')
                    }}
                  />
                  {t('productionOrders.wipCarryoverShort')}
                </label>
                {togetherWipOpen && (
                  <label>
                    <span className="sr-only">{t('productionOrders.wipCarryoverShort')}</span>
                    <input
                      type="number"
                      min={0}
                      disabled={!canManage}
                      className={`${inputCls()} w-24 text-center font-black text-rose-300`}
                      value={togetherWip}
                      onChange={e => onTogetherWip(e.target.value)}
                    />
                  </label>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={!canManage || togetherQty.trim() === ''}
              onClick={onApplyTogether}
              className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40"
            >
              {t('productionOrders.planTogetherApply')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
