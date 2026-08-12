import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { reportMissingPartsBatch, updateMissingPartRecord } from '../services/missingPartsService'
import { updateVehicle } from '../services/vehiclesService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { VehicleIssuesContext } from '../Types/missingPart'
import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import { useMpLookups } from '../hooks/useMpLookups'
import { useFormatError } from '../hooks/useFormatError'
import { MpLookupCreatableSelect } from './MpLookupCreatableSelect'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'
import { isValidVinLength, normalizeChassisVin } from '../Utils/vinValidation'

type Props = {
  vehicle: VehicleIssuesContext | null
  onClose: () => void
  onSaved: () => void
}

type ExistingLine = {
  part: MissingPartDetail
  partDescription: string
  requiredQty: number
  reason: string
  department: string
  notes: string
}

type NewIssue = {
  key: string
  partDescription: string
  reason: string
  department: string
}

function lineChanged(d: ExistingLine): boolean {
  const p = d.part
  return (
    d.partDescription.trim() !== p.partDescription ||
    d.requiredQty !== p.requiredQty ||
    d.reason !== p.reason ||
    d.department !== p.department ||
    (d.notes.trim() || '') !== (p.notes ?? '')
  )
}

function newIssueDraft(reason: string, department: string): NewIssue {
  return { key: crypto.randomUUID(), partDescription: '', reason, department }
}

export function EditMissingPartModal({ vehicle, onClose, onSaved }: Props) {
  const { t } = useLang()
  const { reasons, departments, addReason, addDepartment } = useMpLookups()
  const formatError = useFormatError()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [colorId, setColorId] = useState<string | null>(null)
  const [vin, setVin] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<ExistingLine[]>([])
  const [newIssues, setNewIssues] = useState<NewIssue[]>([])
  const [extraVins, setExtraVins] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openParts = useMemo(
    () =>
      vehicle?.parts.filter(p => vehicle.allowArchived || (p.status !== 'closed' && p.status !== 'cancelled')) ?? [],
    [vehicle]
  )

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      setNewIssues([])
      setExtraVins([])
      return
    }
    setVin(vehicle.vin)
    setNotes(openParts[0]?.notes ?? '')
    setLines(
      openParts.map(p => ({
        part: p,
        partDescription: p.partDescription,
        requiredQty: p.requiredQty,
        reason: p.reason,
        department: p.department,
        notes: p.notes ?? ''
      }))
    )
    setNewIssues([])
    setExtraVins([])
    setError('')
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
        const byName = m.find(x => x.name === vehicle.modelName && x.model_kind === 'variant')
          ?? m.find(x => x.name === vehicle.modelName)
        const mid = byName?.id ?? ''
        setModelId(mid)
        setFamilyId(resolveFamilyIdForVariant(m, mid) || byName?.parent_model_id || '')
        const color = c.find(x => x.name === vehicle.colorName)
        setColorId(color?.id ?? null)
      })
      .catch(err => setError(formatError(err)))
      .finally(() => setListsLoading(false))
  }, [vehicle, openParts, formatError])

  if (!vehicle) return null

  const changedLines = lines.filter(lineChanged)
  const filledNewIssues = newIssues.filter(i => i.partDescription.trim())
  const filledExtraVins = extraVins.map(v => normalizeChassisVin(v).toUpperCase()).filter(isValidVinLength)
  const vinChanged = normalizeChassisVin(vin).toUpperCase() !== vehicle.vin.toUpperCase()
  const originalColor = colors.find(c => c.name === vehicle.colorName)
  const colorChanged = (colorId || null) !== (originalColor?.id ?? null)
  const originalModel = models.find(m => m.name === vehicle.modelName)
  const modelChanged = Boolean(modelId) && modelId !== (originalModel?.id ?? '')

  const hasChanges =
    changedLines.length > 0 ||
    filledNewIssues.length > 0 ||
    filledExtraVins.length > 0 ||
    vinChanged ||
    colorChanged ||
    modelChanged ||
    notes.trim() !== (openParts[0]?.notes ?? '').trim()

  function patchLine(partId: string, patch: Partial<ExistingLine>) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, ...patch } : l)))
  }

  function addExistingStyleIssue() {
    setNewIssues(prev => [
      ...prev,
      newIssueDraft(defaultReasonCode(reasons) || lines[0]?.reason || '', defaultDepartmentCode(departments) || lines[0]?.department || '')
    ])
  }

  async function saveAll() {
    const nextVin = normalizeChassisVin(vin).toUpperCase()
    if (!isValidVinLength(nextVin)) {
      setError(t('mp.errVinIndex', { n: 1 }))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    for (const line of changedLines) {
      if (!line.partDescription.trim()) {
        setError(t('mp.edit.partRequired'))
        return
      }
      if (line.requiredQty < Math.max(1, line.part.installedQty)) {
        setError(t('mp.edit.qtyBelowInstalled'))
        return
      }
    }
    for (let i = 0; i < extraVins.length; i++) {
      const raw = normalizeChassisVin(extraVins[i])
      if (raw && !isValidVinLength(raw)) {
        setError(t('mp.errVinIndex', { n: i + 1 }))
        return
      }
    }
    const allNewVins = filledExtraVins
    if (new Set([nextVin, ...allNewVins]).size !== 1 + allNewVins.length) {
      setError(t('mp.errDuplicateVin'))
      return
    }
    if (!hasChanges) {
      setError(t('mp.edit.nothingChanged'))
      return
    }

    setBusy(true)
    setError('')
    try {
      const sharedNotes = notes.trim()
      if (vinChanged || modelChanged || colorChanged) {
        await updateVehicle(vehicle.vehicleId, {
          vin: nextVin,
          modelId,
          vehicleColorId: colorId
        })
      }

      for (const line of changedLines) {
        await updateMissingPartRecord(line.part.id, {
          partDescription: line.partDescription.trim(),
          requiredQty: Math.max(1, line.requiredQty),
          reason: line.reason,
          department: line.department,
          priority: line.part.priority,
          stopperType: line.part.stopperType,
          notes: sharedNotes || line.notes
        })
      }

      // Apply shared notes to unchanged lines if notes edited.
      if (sharedNotes !== (openParts[0]?.notes ?? '').trim()) {
        for (const line of lines) {
          if (changedLines.some(c => c.part.id === line.part.id)) continue
          await updateMissingPartRecord(line.part.id, {
            partDescription: line.partDescription.trim(),
            requiredQty: Math.max(1, line.requiredQty),
            reason: line.reason,
            department: line.department,
            priority: line.part.priority,
            stopperType: line.part.stopperType,
            notes: sharedNotes
          })
        }
      }

      const newPartLines = filledNewIssues.map(i => ({
        partDescription: i.partDescription.trim(),
        requiredQty: 1,
        reason: i.reason,
        department: i.department,
        stationId: null as string | null
      }))

      if (newPartLines.length > 0) {
        await reportMissingPartsBatch({
          vins: [nextVin],
          modelId,
          parts: newPartLines,
          colorId,
          reason: newPartLines[0].reason,
          department: newPartLines[0].department,
          notes: sharedNotes || undefined,
          factoryOrgUnitId: vehicle.parts[0]?.factoryOrgUnitId ?? undefined
        })
      }

      if (allNewVins.length > 0) {
        const partsForNewVins = [
          ...lines.map(l => ({
            partDescription: l.partDescription.trim(),
            requiredQty: 1,
            reason: l.reason,
            department: l.department,
            stationId: null as string | null
          })),
          ...newPartLines
        ].filter(p => p.partDescription)
        if (partsForNewVins.length === 0) {
          setError(t('mp.edit.needIssueForNewVin'))
          setBusy(false)
          return
        }
        await reportMissingPartsBatch({
          vins: allNewVins,
          modelId,
          parts: partsForNewVins,
          colorId,
          reason: partsForNewVins[0].reason,
          department: partsForNewVins[0].department,
          notes: sharedNotes || undefined,
          factoryOrgUnitId: vehicle.parts[0]?.factoryOrgUnitId ?? undefined
        })
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(vehicle)}
      title={t('mp.edit.vehicleTitle')}
      subtitle={t('mp.act.vehicleIssues', { n: openParts.length + filledNewIssues.length })}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || !hasChanges}
            onClick={() => void saveAll()}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {t('mp.edit.saveAll')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionVehicle')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('mp.f.vin')} required>
              <input
                className="input-dark font-mono"
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                value={vin}
                onChange={e => setVin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
              />
            </Field>
            <Field label={t('mp.f.color')}>
              {listsLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : (
                <select
                  className="input-dark"
                  value={colorId ?? ''}
                  onChange={e => setColorId(e.target.value || null)}
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
            <div className="sm:col-span-2">
              <VehicleModelFamilyPicker
                models={models}
                familyId={familyId}
                variantId={modelId}
                loading={listsLoading}
                onFamilyChange={id => {
                  setFamilyId(id)
                  setModelId('')
                }}
                onVariantChange={id => {
                  setModelId(id)
                  setFamilyId(resolveFamilyIdForVariant(models, id) || familyId)
                }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
            <button
              type="button"
              onClick={addExistingStyleIssue}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
            </button>
          </div>

          <div className="max-h-[min(40vh,360px)] space-y-3 overflow-y-auto pe-1">
            {lines.map((line, idx) => (
              <div key={line.part.id} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                <p className="text-[10px] font-black uppercase text-cyan-400/90">{t('mp.issueN', { n: idx + 1 })}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label={t('mp.cols.reasonClass')} required>
                    <MpLookupCreatableSelect
                      options={reasons}
                      value={line.reason}
                      onChange={code => patchLine(line.part.id, { reason: code })}
                      onCreate={addReason}
                      addLabel={t('mp.addReasonOption')}
                    />
                  </Field>
                  <Field label={t('mp.cols.department')} required>
                    <MpLookupCreatableSelect
                      options={departments}
                      value={line.department}
                      onChange={code => patchLine(line.part.id, { department: code })}
                      onCreate={addDepartment}
                      addLabel={t('mp.addDepartmentOption')}
                    />
                  </Field>
                </div>
                <Field label={t('mp.cols.reason')} required>
                  <input
                    className="input-dark w-full"
                    value={line.partDescription}
                    onChange={e => patchLine(line.part.id, { partDescription: e.target.value })}
                  />
                </Field>
                <Field label={t('mp.cols.qty')}>
                  <input
                    type="number"
                    min={Math.max(1, line.part.installedQty)}
                    className="input-dark w-full"
                    value={line.requiredQty}
                    onChange={e => patchLine(line.part.id, { requiredQty: Number(e.target.value) })}
                  />
                </Field>
              </div>
            ))}

            {newIssues.map((issue, idx) => (
              <div key={issue.key} className="space-y-2 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-cyan-300">
                    {t('mp.edit.newIssue')} · {t('mp.issueN', { n: lines.length + idx + 1 })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewIssues(prev => prev.filter(x => x.key !== issue.key))}
                    className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label={t('mp.cols.reasonClass')} required>
                    <MpLookupCreatableSelect
                      options={reasons}
                      value={issue.reason}
                      onChange={code =>
                        setNewIssues(prev => prev.map(x => (x.key === issue.key ? { ...x, reason: code } : x)))
                      }
                      onCreate={addReason}
                      addLabel={t('mp.addReasonOption')}
                    />
                  </Field>
                  <Field label={t('mp.cols.department')} required>
                    <MpLookupCreatableSelect
                      options={departments}
                      value={issue.department}
                      onChange={code =>
                        setNewIssues(prev => prev.map(x => (x.key === issue.key ? { ...x, department: code } : x)))
                      }
                      onCreate={addDepartment}
                      addLabel={t('mp.addDepartmentOption')}
                    />
                  </Field>
                </div>
                <Field label={t('mp.cols.reason')} required>
                  <input
                    className="input-dark w-full"
                    value={issue.partDescription}
                    onChange={e =>
                      setNewIssues(prev =>
                        prev.map(x => (x.key === issue.key ? { ...x, partDescription: e.target.value } : x))
                      )
                    }
                    placeholder={t('mp.issueReasonPlaceholder')}
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">{t('mp.edit.addVins')}</p>
              <p className="text-[10px] text-slate-500">{t('mp.edit.addVinsHint')}</p>
            </div>
            <button
              type="button"
              onClick={() => setExtraVins(prev => [...prev, ''])}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> {t('mp.edit.addVin')}
            </button>
          </div>
          {extraVins.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input-dark min-w-0 flex-1 font-mono"
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                value={v}
                onChange={e => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setExtraVins(prev => prev.map((x, idx) => (idx === i ? next : x)))
                }}
                placeholder="0000"
              />
              <button
                type="button"
                onClick={() => setExtraVins(prev => prev.filter((_, idx) => idx !== i))}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-red-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>

        <Field label={t('mp.f.notes')}>
          <textarea className="input-dark w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
