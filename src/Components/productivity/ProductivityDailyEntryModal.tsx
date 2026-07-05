import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogIn, LogOut, Save, Wrench } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { ProductivityDelayReasonCell } from './ProductivityDelayReasonCell'
import { ProductivityDailyStopsSummary } from './ProductivityDailyStopsSummary'
import { useProductivityDelayReasons } from '../../hooks/useProductivityDelayReasons'
import {
  buildMonthGrid,
  bulkUpsertEntryProductivity,
  dayInputsFromQuantities,
  getEntryProductivityMonth,
  productivityModelRows,
  readDayQuantities
} from '../../services/entryProductivityService'
import {
  bulkUpsertExitProductivity,
  getExitProductivityMonth
} from '../../services/exitProductivityService'
import {
  bulkUpsertRepairProductivity,
  getRepairProductivityMonth
} from '../../services/repairProductivityService'
import { getProductionLineStops } from '../../services/productionStopService'
import { getVehicleModels } from '../../services/settingsService'
import type { ProductionLineStop } from '../../Types/productionStop'
import type { VehicleModel } from '../../Types/settings'
import type { ProductivityDelayKind } from '../../Types/productivityDelayReason'

type Kind = ProductivityDelayKind

type Props = {
  open: boolean
  kind: Kind
  workDate: string
  onClose: () => void
  onSaved?: () => void
}

function parseYm(workDate: string): { year: number; month: number } {
  const [y, m] = workDate.split('-').map(Number)
  return { year: y, month: m }
}

export function ProductivityDailyEntryModal({ open, kind, workDate, onClose, onSaved }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')

  const { year, month } = useMemo(() => parseYm(workDate), [workDate])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map())
  const [stops, setStops] = useState<ProductionLineStop[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { reasonsByDate, setReason, flushSave } = useProductivityDelayReasons(kind, year, month, canManage)
  const modelRows = useMemo(() => productivityModelRows(models), [models])

  const load = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setError('')
    try {
      const fetchRecords = () => {
        if (kind === 'entry') return getEntryProductivityMonth(year, month)
        if (kind === 'exit') return getExitProductivityMonth(year, month)
        return getRepairProductivityMonth(year, month)
      }
      const [modelList, records, stopList] = await Promise.all([
        getVehicleModels(),
        fetchRecords(),
        getProductionLineStops(year, month)
      ])
      setModels(modelList)
      setStops(stopList)
      const grid = buildMonthGrid(modelList, year, month, records)
      setQuantities(readDayQuantities(grid, modelList, workDate))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [open, kind, year, month, workDate, t])

  useEffect(() => {
    void load()
  }, [load])

  function setQty(modelId: string, value: number) {
    setQuantities(prev => {
      const next = new Map(prev)
      next.set(modelId, Math.max(0, value))
      return next
    })
  }

  const dayTotal = useMemo(
    () => modelRows.reduce((sum, m) => sum + (quantities.get(m.id) ?? 0), 0),
    [modelRows, quantities]
  )

  async function handleSave() {
    if (!canManage) return
    setSaving(true)
    setError('')
    try {
      const inputs = dayInputsFromQuantities(models, workDate, quantities).filter(i => i.quantity > 0)
      if (kind === 'entry') {
        await bulkUpsertEntryProductivity(inputs)
      } else if (kind === 'exit') {
        await bulkUpsertExitProductivity(inputs)
      } else {
        await bulkUpsertRepairProductivity(inputs)
      }
      flushSave(workDate)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const title =
    kind === 'entry'
      ? t('productivity.registerEntry')
      : kind === 'exit'
        ? t('productivity.registerExit')
        : t('productivity.registerRepair')
  const icon =
    kind === 'entry' ? (
      <LogIn className="h-5 w-5" />
    ) : kind === 'exit' ? (
      <LogOut className="h-5 w-5" />
    ) : (
      <Wrench className="h-5 w-5" />
    )

  return (
    <Modal
      open={open}
      title={title}
      subtitle={workDate}
      icon={icon}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        canManage ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        ) : undefined
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : modelRows.length === 0 ? (
        <p className="text-sm text-slate-400">{t('productivity.monthly.noModels')}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {modelRows.map(model => (
              <Field key={model.id} label={model.name}>
                <input
                  type="number"
                  min={0}
                  className={inputCls()}
                  value={quantities.get(model.id) ?? 0}
                  disabled={!canManage}
                  onChange={e => setQty(model.id, Number(e.target.value) || 0)}
                />
              </Field>
            ))}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
            {t('productivity.monthly.dayTotal')}: <strong className="text-white">{dayTotal}</strong>
          </div>

          <ProductivityDailyStopsSummary workDate={workDate} stops={stops} compact />

          <Field label={t('productivity.lossReasonsTitle')}>
            <ProductivityDelayReasonCell
              value={reasonsByDate.get(workDate) ?? ''}
              canManage={canManage}
              placeholder={t('productivity.monthly.delayReasonsPlaceholder')}
              onChange={value => setReason(workDate, value)}
              onBlur={() => flushSave(workDate)}
            />
          </Field>
        </div>
      )}
    </Modal>
  )
}
