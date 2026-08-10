import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useEmployees } from '../hooks/useEmployees'
import { useFactoryOrgScope } from '../hooks/useFactoryOrgScope'
import { Modal } from './Modal'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { reportMissingPartsBatch } from '../services/missingPartsService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { MissingPartBatchLineInput } from '../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import { useFormatError } from '../hooks/useFormatError'
import { useMpLookups } from '../hooks/useMpLookups'
import { MpLookupCreatableSelect } from './MpLookupCreatableSelect'
import { defaultDepartmentCode, defaultReasonCode, isStockShortageReason } from '../Utils/mpLookupLabel'
import { isValidVinLength, normalizeChassisVin } from '../Utils/vinValidation'

type IssueLineDraft = Omit<MissingPartBatchLineInput, 'partDescription'> & {
  key: string
  partItems: string[]
}

function issuePartDescriptions(line: IssueLineDraft): string[] {
  if (isStockShortageReason(line.reason)) {
    return line.partItems.map(s => s.trim()).filter(Boolean)
  }
  const single = line.partItems[0]?.trim()
  return single ? [single] : []
}

function resizeVins(count: number, prev: string[]): string[] {
  const n = Math.max(1, Math.min(count, 20))
  const next = [...prev]
  while (next.length < n) next.push('')
  return next.slice(0, n)
}

function newIssueLine(): IssueLineDraft {
  return {
    key: crypto.randomUUID(),
    partItems: [''],
    requiredQty: 1,
    reason: '',
    department: '',
    stationId: null
  }
}

type VehicleForm = {
  familyId: string
  modelId: string
  colorId: string | null
  notes: string
  vehicleCount: number
  vins: string[]
}

const emptyVehicle: VehicleForm = {
  familyId: '',
  modelId: '',
  colorId: null,
  notes: '',
  vehicleCount: 1,
  vins: ['']
}

type Props = {
  open: boolean
  onClose: () => void
  onReported?: (summary?: string) => void
}

export function ReportMissingPartModal({ open, onClose, onReported }: Props) {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const { scopeRootId, scopeLabel } = useFactoryOrgScope(employees)
  const { reasons, departments, addReason, addDepartment } = useMpLookups()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [issues, setIssues] = useState(() => [newIssueLine()])
  const [vehicle, setVehicle] = useState<VehicleForm>(emptyVehicle)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || reasons.length === 0 || departments.length === 0) return
    setIssues(prev =>
      prev.map(l => ({
        ...l,
        reason: l.reason || defaultReasonCode(reasons),
        department: l.department || defaultDepartmentCode(departments)
      }))
    )
  }, [open, reasons, departments])

  useEffect(() => {
    if (!open) return
    setIssues([
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
    setVehicle(emptyVehicle)
    setFormError('')
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
      })
      .catch(err => setFormError(formatError(err)))
      .finally(() => setListsLoading(false))
  }, [open, formatError, reasons, departments])

  function patchIssue(key: string, patch: Partial<IssueLineDraft>) {
    setIssues(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)))
  }

  function patchIssueReason(key: string, code: string) {
    setIssues(prev =>
      prev.map(line => {
        if (line.key !== key) return line
        if (isStockShortageReason(code) && !isStockShortageReason(line.reason)) {
          const first = line.partItems.map(s => s.trim()).find(Boolean) ?? ''
          return { ...line, reason: code, partItems: first ? [first] : [''] }
        }
        if (!isStockShortageReason(code) && isStockShortageReason(line.reason)) {
          const first = issuePartDescriptions({ ...line, reason: code }).find(Boolean) ?? ''
          return { ...line, reason: code, partItems: [first] }
        }
        return { ...line, reason: code }
      })
    )
  }

  function updatePartItem(key: string, index: number, value: string) {
    setIssues(prev =>
      prev.map(line =>
        line.key === key
          ? { ...line, partItems: line.partItems.map((item, i) => (i === index ? value : item)) }
          : line
      )
    )
  }

  function addPartItem(key: string) {
    setIssues(prev =>
      prev.map(line => (line.key === key ? { ...line, partItems: [...line.partItems, ''] } : line))
    )
  }

  function removePartItem(key: string, index: number) {
    setIssues(prev =>
      prev.map(line => {
        if (line.key !== key || line.partItems.length <= 1) return line
        return { ...line, partItems: line.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function setVehicleCount(n: number) {
    const count = Math.max(1, Math.min(20, n))
    setVehicle(prev => ({ ...prev, vehicleCount: count, vins: resizeVins(count, prev.vins) }))
  }

  function updateVehicleVin(index: number, value: string) {
    setVehicle(prev => ({ ...prev, vins: prev.vins.map((v, i) => (i === index ? value : v)) }))
  }

  function addIssue() {
    setIssues(prev => [
      ...prev,
      {
        ...newIssueLine(),
        reason: defaultReasonCode(reasons),
        department: defaultDepartmentCode(departments)
      }
    ])
  }

  function removeIssue(key: string) {
    setIssues(prev => (prev.length <= 1 ? prev : prev.filter(l => l.key !== key)))
  }

  async function submit() {
    const missing: string[] = []

    if (!scopeRootId) missing.push(t('mp.errNoOrgUnit'))
    if (!vehicle.modelId) missing.push(t('mp.f.model'))

    const expandedParts = issues.flatMap(line =>
      issuePartDescriptions(line).map(partDescription => ({
        partDescription,
        requiredQty: 1,
        reason: line.reason,
        department: line.department,
        stationId: null as string | null
      }))
    )
    if (expandedParts.length === 0) missing.push(t('mp.errOneIssue'))

    const vinList = vehicle.vins.map(v => normalizeChassisVin(v)).filter(Boolean)
    if (vinList.length !== vehicle.vehicleCount) missing.push(t('mp.errAllVins'))
    for (let vi = 0; vi < vinList.length; vi++) {
      if (!isValidVinLength(vinList[vi])) missing.push(t('mp.errVinIndex', { n: vi + 1 }))
    }
    const uniqueVins = new Set(vinList)
    if (uniqueVins.size !== vinList.length) missing.push(t('mp.errDuplicateVin'))

    if (missing.length > 0) {
      setFormError(missing.join(' · '))
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const normalizedVins = vehicle.vins.map(v => normalizeChassisVin(v))
      const result = await reportMissingPartsBatch({
        vins: normalizedVins,
        modelId: vehicle.modelId,
        parts: expandedParts,
        colorId: vehicle.colorId,
        reason: expandedParts[0]?.reason ?? issues[0]?.reason,
        department: expandedParts[0]?.department ?? issues[0]?.department,
        notes: vehicle.notes || undefined,
        factoryOrgUnitId: scopeRootId
      })
      onReported?.(t('mp.batchSuccess', { cars: result.vehicle_count, parts: result.missing_part_count }))
      onClose()
    } catch (err) {
      setFormError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const totalRecords =
    issues.reduce((sum, line) => sum + issuePartDescriptions(line).length, 0) * vehicle.vehicleCount

  return (
    <Modal
      open={open}
      title={t('mp.reportTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="w-full space-y-3">
          {formError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">{formError}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionOrg')}</h3>
          <p className="text-xs text-slate-500">{t('mp.orgAutoHint')}</p>
          {scopeLabel ? (
            <p className="text-sm font-bold text-white">{scopeLabel}</p>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">{t('mp.errNoOrgUnit')}</p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionVehicle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <VehicleModelFamilyPicker
                models={models}
                familyId={vehicle.familyId}
                variantId={vehicle.modelId}
                loading={listsLoading}
                onFamilyChange={familyId => setVehicle(p => ({ ...p, familyId, modelId: '' }))}
                onVariantChange={modelId =>
                  setVehicle(p => ({
                    ...p,
                    modelId,
                    familyId: resolveFamilyIdForVariant(models, modelId) || p.familyId
                  }))
                }
              />
            </div>
            <Field label={t('mp.f.color')}>
              {listsLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : colors.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  {t('mp.noColorsInSettings')}
                </p>
              ) : (
                <select
                  className="input-dark"
                  value={vehicle.colorId ?? ''}
                  onChange={e => setVehicle(p => ({ ...p, colorId: e.target.value || null }))}
                >
                  <option value="">—</option>
                  {colors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('mp.f.vehicleCount')} required>
              <input
                type="number"
                min={1}
                max={20}
                className="input-dark"
                value={vehicle.vehicleCount}
                onChange={e => setVehicleCount(Number(e.target.value) || 1)}
              />
            </Field>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {vehicle.vehicleCount === 1 ? t('mp.singleVinTitle') : t('mp.vinListTitle')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicle.vins.map((vin, vi) => (
                <Field key={vi} label={vehicle.vehicleCount === 1 ? t('mp.f.vin') : t('mp.f.vinN', { n: vi + 1 })} required>
                  <input
                    className="input-dark font-mono"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={4}
                    value={vin}
                    onChange={e => updateVehicleVin(vi, e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="0000"
                  />
                </Field>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">{t('mp.sectionIssuesHint')}</p>
            </div>
            <button type="button" onClick={addIssue} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
            </button>
          </div>

          <div className="space-y-3">
            {issues.map((line, idx) => (
              <div key={line.key} className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-cyan-400/80">{t('mp.issueN', { n: idx + 1 })}</p>
                  <button
                    type="button"
                    disabled={issues.length <= 1}
                    onClick={() => removeIssue(line.key)}
                    className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25 disabled:opacity-30"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t('mp.cols.reasonClass')} required>
                    <MpLookupCreatableSelect
                      options={reasons}
                      value={line.reason}
                      onChange={code => patchIssueReason(line.key, code)}
                      onCreate={addReason}
                      addLabel={t('mp.addReasonOption')}
                    />
                  </Field>
                  <Field label={t('mp.cols.department')} required>
                    <MpLookupCreatableSelect
                      options={departments}
                      value={line.department}
                      onChange={code => patchIssue(line.key, { department: code })}
                      onCreate={addDepartment}
                      addLabel={t('mp.addDepartmentOption')}
                    />
                  </Field>
                </div>

                <Field label={t('mp.cols.reason')} required>
                  {isStockShortageReason(line.reason) ? (
                    <div className="space-y-2">
                      {line.partItems.map((item, pi) => (
                        <div key={pi} className="flex gap-2">
                          <input
                            className="input-dark min-w-0 flex-1"
                            value={item}
                            onChange={e => updatePartItem(line.key, pi, e.target.value)}
                            placeholder={t('mp.stockItemPlaceholder')}
                          />
                          {line.partItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePartItem(line.key, pi)}
                              className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          {pi === line.partItems.length - 1 && (
                            <button
                              type="button"
                              onClick={() => addPartItem(line.key)}
                              className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 hover:bg-cyan-500/20"
                              title={t('mp.addStockItem')}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <p className="text-[10px] text-slate-500">{t('mp.stockItemsHint')}</p>
                    </div>
                  ) : (
                    <input
                      className="input-dark"
                      value={line.partItems[0] ?? ''}
                      onChange={e => updatePartItem(line.key, 0, e.target.value)}
                      placeholder={t('mp.issueReasonPlaceholder')}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>

          {totalRecords > 0 && (
            <p className="text-[10px] text-slate-500">{t('mp.batchHintTotal', { total: totalRecords })}</p>
          )}
        </section>

        <section>
          <Field label={t('mp.f.notes')}>
            <textarea className="input-dark min-h-16" value={vehicle.notes} onChange={e => setVehicle(p => ({ ...p, notes: e.target.value }))} />
          </Field>
        </section>
      </div>
    </Modal>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-300">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
