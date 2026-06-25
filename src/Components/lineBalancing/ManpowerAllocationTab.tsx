import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCcw, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { inputCls } from '../FormField'
import {
  assignEmployeeToLine,
  clearAllocationLines,
  getAllocationLines,
  getOrCreateAllocationDay,
  getQualifiedEmployeesForOperation,
  getUnderstaffedOperations,
  seedAllocationFromRouting
} from '../../services/manpowerAllocationService'
import type { AllocationShift, ManpowerAllocationDay, ManpowerAllocationLine, ManpowerWarningCode } from '../../Types/manpower'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

type OverrideState = {
  lineId: string
  employeeId: string
  warnings: ManpowerWarningCode[]
}

export function ManpowerAllocationTab({ models, canManage, notify }: Props) {
  const { t } = useLang()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [shift, setShift] = useState<AllocationShift>('day')
  const [modelId, setModelId] = useState('')
  const [day, setDay] = useState<ManpowerAllocationDay | null>(null)
  const [lines, setLines] = useState<ManpowerAllocationLine[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [understaffed, setUnderstaffed] = useState<string[]>([])
  const [override, setOverride] = useState<OverrideState | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  const loadDay = useCallback(async () => {
    setLoading(true)
    try {
      const d = await getOrCreateAllocationDay(date, shift, modelId || null)
      setDay(d)
      const ls = await getAllocationLines(d.id)
      setLines(ls)
      setUnderstaffed(await getUnderstaffedOperations(d.id))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
      setDay(null)
      setLines([])
    } finally {
      setLoading(false)
    }
  }, [date, shift, modelId, notify, t])

  useEffect(() => {
    void loadDay()
  }, [loadDay])

  const grouped = useMemo(() => {
    const map = new Map<string, ManpowerAllocationLine[]>()
    for (const l of lines) {
      const key = l.operation_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return [...map.entries()]
  }, [lines])

  async function seedRouting(replace = false) {
    if (!day || !modelId || !canManage) {
      notify(t('manpower.modelRequired'), true)
      return
    }
    setBusy(true)
    try {
      const n = await seedAllocationFromRouting(day.id, modelId, { replace })
      await loadDay()
      notify(t('manpower.seeded', { n: String(n) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'DAY_HAS_LINES') notify(t('manpower.dayHasLines'), true)
      else notify(msg || t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function clearAndReseed() {
    if (!day || !modelId || !canManage) return
    setBusy(true)
    try {
      await clearAllocationLines(day.id)
      await seedRouting(false)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function onAssign(line: ManpowerAllocationLine, employeeId: string) {
    if (!canManage || !day) return
    if (!employeeId) {
      await assignEmployeeToLine(line.id, null, {
        allocationDate: day.allocation_date,
        operationId: line.operation_id
      })
      await loadDay()
      return
    }
    try {
      await assignEmployeeToLine(line.id, employeeId, {
        allocationDate: day.allocation_date,
        operationId: line.operation_id
      })
      await loadDay()
      notify(t('manpower.assigned'))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.startsWith('WARNINGS:')) {
        const codes = msg.slice(9).split(',') as ManpowerWarningCode[]
        setOverride({ lineId: line.id, employeeId, warnings: codes })
        setOverrideReason('')
        return
      }
      notify(msg || t('common.error'), true)
    }
  }

  async function confirmOverride() {
    if (!override || !overrideReason.trim() || !day) {
      notify(t('manpower.overrideReasonRequired'), true)
      return
    }
    setBusy(true)
    try {
      await assignEmployeeToLine(override.lineId, override.employeeId, {
        overrideReason,
        allocationDate: day.allocation_date
      })
      setOverride(null)
      await loadDay()
      notify(t('manpower.assignedOverride'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  function warningLabel(code: ManpowerWarningCode): string {
    return t(`manpower.warnings.${code}`)
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">{t('manpower.date')}</span>
          <input type="date" className={inputCls()} value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">{t('manpower.shift')}</span>
          <select className={inputCls()} value={shift} onChange={e => setShift(e.target.value as AllocationShift)}>
            <option value="day">{t('manpower.shifts.day')}</option>
            <option value="evening">{t('manpower.shifts.evening')}</option>
            <option value="night">{t('manpower.shifts.night')}</option>
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs text-slate-500">{t('bom.model')}</span>
          <select className={inputCls()} value={modelId} onChange={e => setModelId(e.target.value)}>
            <option value="">{t('bom.allModels')}</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={() => void loadDay()} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200">
            <RefreshCcw className="inline h-4 w-4" />
          </button>
          {canManage && modelId && (
            <>
              <button
                type="button"
                disabled={busy || !day}
                onClick={() => void seedRouting()}
                className="rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-slate-950"
              >
                {t('manpower.seedRouting')}
              </button>
              {lines.length > 0 && (
                <button
                  type="button"
                  disabled={busy || !day}
                  onClick={() => void clearAndReseed()}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200"
                >
                  {t('manpower.clearReseed')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {understaffed.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mb-1 inline h-4 w-4" /> {t('manpower.understaffed', { n: understaffed.length })}
        </div>
      )}

      <div className="card-industrial overflow-hidden">
        {loading ? (
          <p className="p-4 text-slate-400">{t('common.loading')}</p>
        ) : lines.length === 0 ? (
          <p className="flex items-center gap-2 p-4 text-slate-400">
            <Users className="h-5 w-5" />
            {t('manpower.empty')}
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {grouped.map(([opId, slots]) => {
              const head = slots[0]
              const isUnder = understaffed.includes(opId)
              return (
                <div key={opId} className="p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-white">{head.operation_name_ar}</p>
                      <p className="text-xs text-slate-500">
                        {head.station_number} {head.station_name}
                        {head.standard_time_seconds != null && ` · ${head.standard_time_seconds}s`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {t('manpower.slots', { n: String(slots.length), req: String(head.required_manpower) })}
                    </span>
                  </div>
                  {isUnder && (
                    <p className="mb-2 text-xs text-amber-300">{t('manpower.warnings.understaffed')}</p>
                  )}
                  <div className="space-y-2">
                    {slots.map(line => (
                      <LineAssignRow
                        key={line.id}
                        line={line}
                        canManage={canManage}
                        warningLabel={warningLabel}
                        onAssign={employeeId => void onAssign(line, employeeId)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!override}
        title={t('manpower.overrideTitle')}
        subtitle={override?.warnings.map(warningLabel).join(' · ')}
        onClose={() => setOverride(null)}
        footer={
          <button
            type="button"
            disabled={busy}
            className="btn-industrial bg-amber-600 text-white"
            onClick={() => void confirmOverride()}
          >
            {t('manpower.confirmOverride')}
          </button>
        }
      >
        <div className="p-5">
          <label className="block text-xs text-slate-400">{t('manpower.overrideReason')}</label>
          <textarea
            className={`${inputCls()} mt-1 min-h-[80px] w-full`}
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}

function LineAssignRow({
  line,
  canManage,
  warningLabel,
  onAssign
}: {
  line: ManpowerAllocationLine
  canManage: boolean
  warningLabel: (c: ManpowerWarningCode) => string
  onAssign: (employeeId: string) => void
}) {
  const { t } = useLang()
  const [candidates, setCandidates] = useState<
    Awaited<ReturnType<typeof getQualifiedEmployeesForOperation>>
  >([])

  useEffect(() => {
    if (!canManage) return
    getQualifiedEmployeesForOperation(line.operation_id, line.allocation_date)
      .then(setCandidates)
      .catch(() => setCandidates([]))
  }, [line.operation_id, line.allocation_date, canManage])

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
      <span className="w-8 text-xs font-mono text-slate-500">#{line.slot_no}</span>
      {canManage ? (
        <select
          className={`${inputCls()} min-w-[200px] flex-1`}
          value={line.assigned_employee_id ?? ''}
          onChange={e => onAssign(e.target.value)}
        >
          <option value="">{t('manpower.unassigned')}</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>
              {c.full_name} ({c.employee_code})
              {c.warnings.length ? ` ⚠` : ''}
              {c.rating ? ` ★${c.rating}` : ''}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-slate-200">{line.employee_name ?? t('manpower.unassigned')}</span>
      )}
      {line.warnings.length > 0 && (
        <span className="text-xs text-amber-300">
          {line.warnings.map(w => warningLabel(w as ManpowerWarningCode)).join(' · ')}
          {line.is_override && ` (${t('manpower.overridden')})`}
        </span>
      )}
    </div>
  )
}
