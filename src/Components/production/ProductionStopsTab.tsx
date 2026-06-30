import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertOctagon, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { computeTaktMinutes, lostVehiclesFromStopMinutes } from '../../Utils/productionLineRate'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { MpLookupCreatableSelect } from '../MpLookupCreatableSelect'
import { Field, inputCls } from '../FormField'
import { TableExportButtons } from '../TableExportButtons'
import type { TableExportColumn } from '../../Utils/tableExport'
import {
  createProductionLineStop,
  deleteProductionLineStop,
  getProductionLineStops,
  stopDurationMinutes,
  updateProductionLineStop
} from '../../services/productionStopService'
import { getProductionPlanWorkDays } from '../../services/productionPlanWorkDaysService'
import type { ProductionLineStop, ProductionLineStopInput, ProductionStopType } from '../../Types/productionStop'
import { getVehicleModels } from '../../services/settingsService'
import type { VehicleModel } from '../../Types/settings'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../../Utils/datetimeLocal'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

type DeptSummaryRow = {
  code: string
  label: string
  lost: number
  minutes: number
}

function currentYm() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function emptyForm(): ProductionLineStopInput {
  const now = new Date()
  const end = new Date(now.getTime() + 30 * 60_000)
  return {
    stopReason: '',
    stopType: 'partial',
    vehicleModelId: null,
    startedAt: now.toISOString(),
    endedAt: end.toISOString(),
    department: '',
    lostVehicles: 0,
    notes: ''
  }
}

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function ProductionStopsTab() {
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const { departments, addDepartment } = useMpLookups()
  const canManage = hasRole('admin', 'production')

  const init = currentYm()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [items, setItems] = useState<ProductionLineStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProductionLineStop | null>(null)
  const [form, setForm] = useState<ProductionLineStopInput>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductionLineStop | null>(null)
  const [taktMinutes, setTaktMinutes] = useState<number | null>(null)
  const [models, setModels] = useState<VehicleModel[]>([])

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getProductionLineStops(year, month))
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [year, month, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!formOpen) return
    void getVehicleModels()
      .then(list => setModels(list.filter(m => m.is_active)))
      .catch(() => setModels([]))
  }, [formOpen])

  useEffect(() => {
    if (!formOpen) return
    const started = new Date(form.startedAt)
    if (Number.isNaN(started.getTime())) {
      setTaktMinutes(null)
      return
    }
    void getProductionPlanWorkDays(started.getFullYear(), started.getMonth() + 1)
      .then(config => {
        const jph = config?.lineJph ?? 0
        setTaktMinutes(computeTaktMinutes(jph > 0 ? jph : null))
      })
      .catch(() => setTaktMinutes(null))
  }, [formOpen, form.startedAt])

  useEffect(() => {
    if (!formOpen || editing) return
    setForm(prev => {
      const lost = lostVehiclesFromStopMinutes(
        stopDurationMinutes(prev.startedAt, prev.endedAt),
        taktMinutes
      )
      return prev.lostVehicles === lost ? prev : { ...prev, lostVehicles: lost }
    })
  }, [formOpen, editing, taktMinutes])

  const totals = useMemo(
    () => ({
      count: items.length,
      lostVehicles: items.reduce((n, i) => n + i.lostVehicles, 0),
      minutes: items.reduce((n, i) => n + stopDurationMinutes(i.startedAt, i.endedAt), 0)
    }),
    [items]
  )

  const byDepartment = useMemo((): DeptSummaryRow[] => {
    const map = new Map<string, { lost: number; minutes: number }>()
    for (const item of items) {
      const cur = map.get(item.department) ?? { lost: 0, minutes: 0 }
      map.set(item.department, {
        lost: cur.lost + item.lostVehicles,
        minutes: cur.minutes + stopDurationMinutes(item.startedAt, item.endedAt)
      })
    }
    return [...map.entries()]
      .map(([code, stats]) => ({
        code,
        label: mpLookupLabel(departments, code, lang),
        lost: stats.lost,
        minutes: stats.minutes
      }))
      .sort((a, b) => b.lost - a.lost || b.minutes - a.minutes)
  }, [items, departments, lang])

  const deptExportColumns = useMemo(
    (): TableExportColumn<DeptSummaryRow & { downtimeLabel: string }>[] => [
      { label: t('productivity.stops.deptSummaryCols.department'), value: r => r.label },
      { label: t('productivity.stops.deptSummaryCols.lost'), value: r => r.lost },
      { label: t('productivity.stops.deptSummaryCols.downtime'), value: r => r.downtimeLabel }
    ],
    [t]
  )

  const deptExportRows = useMemo(
    () =>
      byDepartment.map(row => ({
        ...row,
        downtimeLabel: formatDuration(row.minutes)
      })),
    [byDepartment, t]
  )

  function formatDuration(minutes: number) {
    if (minutes < 60) return t('productivity.stops.durationMinutes', { n: minutes })
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? t('productivity.stops.durationHoursMinutes', { h, m }) : t('productivity.stops.durationHours', { h })
  }

  function formatDt(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
    return d.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
  }

  function applyLostFromDuration(input: ProductionLineStopInput): ProductionLineStopInput {
    return {
      ...input,
      lostVehicles: lostVehiclesFromStopMinutes(
        stopDurationMinutes(input.startedAt, input.endedAt),
        taktMinutes
      )
    }
  }

  function openCreate() {
    const base = emptyForm()
    if (departments.length > 0) base.department = departments[0].code
    setEditing(null)
    setForm(base)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(row: ProductionLineStop) {
    setEditing(row)
    setForm({
      stopReason: row.stopReason,
      stopType: row.stopType,
      vehicleModelId: row.vehicleModelId,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      department: row.department,
      lostVehicles: row.lostVehicles,
      notes: row.notes ?? ''
    })
    setFormError('')
    setFormOpen(true)
  }

  function stopTypeLabel(type: ProductionStopType) {
    return type === 'full' ? t('productivity.stops.stopTypeFull') : t('productivity.stops.stopTypePartial')
  }

  function modelLabel(modelId: string | null, fallbackName: string | null) {
    if (fallbackName) return fallbackName
    if (!modelId) return '—'
    return models.find(m => m.id === modelId)?.name ?? '—'
  }

  function validate(): string | null {
    if (!form.stopReason.trim()) return t('productivity.stops.errReason')
    if (!form.department) return t('productivity.stops.errDepartment')
    if (!form.startedAt || !form.endedAt) return t('productivity.stops.errTime')
    if (new Date(form.endedAt).getTime() <= new Date(form.startedAt).getTime()) return t('productivity.stops.errTimeOrder')
    if (form.lostVehicles < 0) return t('productivity.stops.errLost')
    return null
  }

  async function save() {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editing) await updateProductionLineStop(editing.id, form)
      else await createProductionLineStop(form)
      setFormOpen(false)
      setSuccess(t(editing ? 'settings.updated' : 'settings.added'))
      window.setTimeout(() => setSuccess(''), 2500)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteProductionLineStop(deleteTarget.id)
      setDeleteTarget(null)
      setSuccess(t('settings.deleted'))
      window.setTimeout(() => setSuccess(''), 2500)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/15 p-3 text-red-300">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('productivity.stops.title')}</h3>
              <p className="text-sm text-slate-400">{t('productivity.stops.subtitle')}</p>
            </div>
          </div>
          <input
            type="month"
            className={`${inputCls()} w-full sm:w-auto sm:min-w-[10rem]`}
            value={monthValue}
            onChange={e => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) {
                setYear(y)
                setMonth(m)
              }
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatPill label={t('productivity.stops.totalStops')} value={String(totals.count)} />
          <StatPill label={t('productivity.stops.totalLost')} value={String(totals.lostVehicles)} tone="amber" />
          <StatPill label={t('productivity.stops.totalDowntime')} value={formatDuration(totals.minutes)} tone="red" />
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-sm font-black text-slate-300">{t('productivity.stops.deptSummaryTitle')}</h4>
            {byDepartment.length > 0 && (
              <TableExportButtons
                filename={`stops-dept-summary-${monthValue}`}
                title={t('productivity.stops.deptSummaryExportTitle', { month: monthValue })}
                columns={deptExportColumns}
                rows={deptExportRows}
              />
            )}
          </div>
          {byDepartment.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('productivity.stops.deptSummaryEmpty')}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className={`${cell} font-black`}>{t('productivity.stops.deptSummaryCols.department')}</th>
                    <th className={`${cell} font-black`}>{t('productivity.stops.deptSummaryCols.lost')}</th>
                    <th className={`${cell} font-black`}>{t('productivity.stops.deptSummaryCols.downtime')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {byDepartment.map(row => (
                    <tr key={row.code} className="hover:bg-slate-900/40">
                      <td className={`${cell} font-bold text-white`}>{row.label}</td>
                      <td className={`${cell} font-black text-amber-300`}>{row.lost}</td>
                      <td className={`${cell} font-mono text-cyan-300`}>{formatDuration(row.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-cyan-900/25 transition hover:bg-cyan-400 sm:text-lg"
          >
            <Plus className="h-5 w-5" />
            {t('productivity.stops.add')}
          </button>
        )}
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('productivity.stops.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('productivity.stops.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.model')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.stopType')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.reason')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.from')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.to')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.duration')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.department')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('productivity.stops.cols.lost')}</th>
              {canManage && <th className={`${cell} font-black text-slate-400`}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map(row => {
              const mins = stopDurationMinutes(row.startedAt, row.endedAt)
              return (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} text-slate-300`}>{modelLabel(row.vehicleModelId, row.vehicleModelName)}</td>
                  <td className={cell}>
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${
                        row.stopType === 'full' ? 'bg-red-500/20 text-red-200' : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {stopTypeLabel(row.stopType)}
                    </span>
                  </td>
                  <td className={`${cell} max-w-[200px] truncate font-bold text-white`} title={row.stopReason}>
                    {row.stopReason}
                  </td>
                  <td className={`${cell} text-slate-300`} dir="ltr">
                    {formatDt(row.startedAt)}
                  </td>
                  <td className={`${cell} text-slate-300`} dir="ltr">
                    {formatDt(row.endedAt)}
                  </td>
                  <td className={`${cell} font-mono text-cyan-300`}>{formatDuration(mins)}</td>
                  <td className={cell}>{mpLookupLabel(departments, row.department, lang)}</td>
                  <td className={`${cell} font-black text-amber-300`}>{row.lostVehicles}</td>
                  {canManage && (
                    <td className={cell}>
                      <div className="flex justify-center gap-1">
                        <button type="button" title={t('common.edit')} onClick={() => openEdit(row)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" title={t('common.delete')} onClick={() => setDeleteTarget(row)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading && <p className="p-8 text-center text-slate-500">{t('common.loading')}</p>}
        {!loading && items.length === 0 && !setupRequired && (
          <p className="p-8 text-center text-slate-500">{t('productivity.stops.empty')}</p>
        )}
      </div>

      <Modal
        open={formOpen}
        title={editing ? t('productivity.stops.editTitle') : t('productivity.stops.addTitle')}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>}
          <Field label={t('productivity.stops.fields.model')}>
            <select
              className={inputCls()}
              value={form.vehicleModelId ?? ''}
              onChange={e => setForm(p => ({ ...p, vehicleModelId: e.target.value || null }))}
            >
              <option value="">{t('productivity.stops.noModel')}</option>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.parent_name ? `${m.parent_name} — ${m.name}` : m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('productivity.stops.fields.stopType')} required>
            <div className="flex flex-wrap gap-2">
              {(['partial', 'full'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, stopType: type }))}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    form.stopType === type
                      ? type === 'full'
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {stopTypeLabel(type)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('productivity.stops.fields.reason')} required>
            <input
              className={inputCls()}
              value={form.stopReason}
              onChange={e => setForm(p => ({ ...p, stopReason: e.target.value }))}
              placeholder={t('productivity.stops.reasonPlaceholder')}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('productivity.stops.fields.from')} required>
              <input
                type="datetime-local"
                className={inputCls()}
                value={toDatetimeLocalValue(form.startedAt)}
                onChange={e =>
                  setForm(p => applyLostFromDuration({ ...p, startedAt: fromDatetimeLocalValue(e.target.value) }))
                }
              />
            </Field>
            <Field label={t('productivity.stops.fields.to')} required>
              <input
                type="datetime-local"
                className={inputCls()}
                value={toDatetimeLocalValue(form.endedAt)}
                onChange={e =>
                  setForm(p => applyLostFromDuration({ ...p, endedAt: fromDatetimeLocalValue(e.target.value) }))
                }
              />
            </Field>
          </div>
          <Field label={t('productivity.stops.fields.department')} required>
            <MpLookupCreatableSelect
              className={inputCls()}
              options={departments}
              value={form.department}
              onChange={code => setForm(p => ({ ...p, department: code }))}
              onCreate={addDepartment}
              addLabel={t('mp.addDepartmentOption')}
            />
          </Field>
          <Field label={t('productivity.stops.fields.lost')} required>
            <input
              type="number"
              min={0}
              className={inputCls()}
              value={form.lostVehicles}
              onChange={e => setForm(p => ({ ...p, lostVehicles: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
            />
            {taktMinutes != null && taktMinutes > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {t('productivity.stops.lostAutoHint', { takt: taktMinutes.toFixed(1) })}
              </p>
            )}
          </Field>
          <Field label={t('productivity.stops.fields.notes')}>
            <textarea className={`${inputCls()} min-h-20`} value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('common.delete')}
        message={deleteTarget?.stopReason ?? ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

function StatPill({ label, value, tone = 'cyan' }: { label: string; value: string; tone?: 'cyan' | 'amber' | 'red' }) {
  const toneCls =
    tone === 'amber' ? 'text-amber-300' : tone === 'red' ? 'text-red-300' : 'text-cyan-300'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-center">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneCls}`}>{value}</p>
    </div>
  )
}
