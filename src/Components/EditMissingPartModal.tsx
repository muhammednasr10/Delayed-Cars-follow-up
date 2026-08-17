import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { EditableVinList } from './EditableVinList'
import { VinConflictDialog } from './VinConflictDialog'
import { reportMissingPartsBatch, updateMissingPartRecord, deleteMissingPartRecord, attachMissingPartsToReportGroup } from '../services/missingPartsService'
import { updateVehicle } from '../services/vehiclesService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { VehicleIssuesContext } from '../Types/missingPart'
import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import { useMpLookups } from '../hooks/useMpLookups'
import { useEmployees } from '../hooks/useEmployees'
import { useMissingPartsUiPermissions } from '../hooks/useMissingPartsUiPermissions'
import { useFormatError } from '../hooks/useFormatError'
import { useVinListConflict } from '../hooks/useVinListConflict'
import { MpIssueLookupsFields } from './missingParts/MpIssueLookupsFields'
import { MpIssueFollowUpButton } from './missingParts/MpIssueFollowUpButton'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'
import { isValidVinLength } from '../Utils/vinValidation'
import { normalizeVinKey, sanitizeChassisDigits } from '../Utils/vinListConflict'

type Props = {
  vehicle: VehicleIssuesContext | null
  activeListParts?: MissingPartDetail[]
  onClose: () => void
  onSaved: () => void
}

type ExistingLine = {
  part: MissingPartDetail
  partItems: string[]
  requiredQty: number
  reason: string
  department: string
  notes: string
  completingDepartment: string
  followUpEmployeeId: string
}

type NewIssue = {
  key: string
  partItems: string[]
  reason: string
  department: string
  completingDepartment: string
  followUpEmployeeId: string
}

function filledPartItems(items: string[]): string[] {
  return items.map(s => s.trim()).filter(Boolean)
}

function lineChanged(d: ExistingLine): boolean {
  const p = d.part
  const filled = filledPartItems(d.partItems)
  const primary = (filled[0] ?? '').trim()
  return (
    primary !== p.partDescription ||
    filled.length > 1 ||
    d.requiredQty !== p.requiredQty ||
    d.reason !== p.reason ||
    d.department !== p.department ||
    (d.completingDepartment || '') !== (p.completingDepartment ?? '') ||
    (d.followUpEmployeeId || '') !== (p.followUpEmployeeId ?? '') ||
    (d.notes.trim() || '') !== (p.notes ?? '')
  )
}

function newIssueDraft(reason: string, department: string): NewIssue {
  return {
    key: crypto.randomUUID(),
    partItems: [''],
    reason,
    department,
    completingDepartment: '',
    followUpEmployeeId: ''
  }
}

export function EditMissingPartModal({ vehicle, activeListParts = [], onClose, onSaved }: Props) {
  const { t } = useLang()
  const { reasons, departments, orgUnits, addReason } = useMpLookups()
  const { employees } = useEmployees()
  const { canAssignFollowUp } = useMissingPartsUiPermissions()
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
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openParts = useMemo(
    () =>
      vehicle?.parts.filter(p => vehicle.allowArchived || (p.status !== 'closed' && p.status !== 'cancelled')) ?? [],
    [vehicle]
  )
  const ownedPartIds = useMemo(() => new Set(openParts.map(p => p.id)), [openParts])
  const ownedVins = useMemo(
    () => (vehicle ? new Set([normalizeVinKey(vehicle.vin)]) : new Set<string>()),
    [vehicle]
  )
  const {
    conflictVin,
    reset: resetVinConflicts,
    forgetDecision,
    promptIfNeeded,
    choose: chooseVinConflict,
    requireResolved,
    clearPartIds
  } = useVinListConflict({ activeListParts, ownedPartIds, ownedVins })

  useEffect(() => {
    if (!vehicle) {
      setLines([])
      setNewIssues([])
      setExtraVins([])
      resetVinConflicts()
      return
    }
    setVin(vehicle.vin)
    setNotes(openParts[0]?.notes ?? '')
    setLines(
      openParts.map(p => ({
        part: p,
        partItems: [p.partDescription],
        requiredQty: p.requiredQty,
        reason: p.reason,
        department: p.department,
        notes: p.notes ?? '',
        completingDepartment: p.completingDepartment ?? '',
        followUpEmployeeId: p.followUpEmployeeId ?? ''
      }))
    )
    setNewIssues([])
    setExtraVins([])
    setRemovedIds([])
    resetVinConflicts()
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
  }, [vehicle, openParts, formatError, resetVinConflicts])

  if (!vehicle) return null

  const changedLines = lines.filter(lineChanged)
  const filledNewIssues = newIssues.filter(i => filledPartItems(i.partItems).length > 0)
  const filledExtraVins = extraVins.map(v => normalizeVinKey(v)).filter(isValidVinLength)
  const vinChanged = normalizeVinKey(vin) !== normalizeVinKey(vehicle.vin)
  const originalColor = colors.find(c => c.name === vehicle.colorName)
  const colorChanged = (colorId || null) !== (originalColor?.id ?? null)
  const originalModel = models.find(m => m.name === vehicle.modelName)
  const modelChanged = Boolean(modelId) && modelId !== (originalModel?.id ?? '')

  const hasChanges =
    changedLines.length > 0 ||
    filledNewIssues.length > 0 ||
    filledExtraVins.length > 0 ||
    removedIds.length > 0 ||
    vinChanged ||
    colorChanged ||
    modelChanged ||
    notes.trim() !== (openParts[0]?.notes ?? '').trim()

  function patchLine(partId: string, patch: Partial<ExistingLine>) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, ...patch } : l)))
  }

  function removeExistingLine(line: ExistingLine) {
    const label = filledPartItems(line.partItems)[0] || line.part.partDescription
    if (!window.confirm(t('mp.deleteConfirm', { part: label }))) return
    setRemovedIds(prev => [...prev, line.part.id])
    setLines(prev => prev.filter(l => l.part.id !== line.part.id))
  }

  function updateLinePartItem(partId: string, index: number, value: string) {
    setLines(prev =>
      prev.map(l =>
        l.part.id === partId
          ? { ...l, partItems: l.partItems.map((item, i) => (i === index ? value : item)) }
          : l
      )
    )
  }

  function addLinePartItem(partId: string) {
    setLines(prev => prev.map(l => (l.part.id === partId ? { ...l, partItems: [...l.partItems, ''] } : l)))
  }

  function removeLinePartItem(partId: string, index: number) {
    setLines(prev =>
      prev.map(l => {
        if (l.part.id !== partId || l.partItems.length <= 1) return l
        return { ...l, partItems: l.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function updateNewIssuePartItem(key: string, index: number, value: string) {
    setNewIssues(prev =>
      prev.map(issue =>
        issue.key === key
          ? { ...issue, partItems: issue.partItems.map((item, i) => (i === index ? value : item)) }
          : issue
      )
    )
  }

  function addNewIssuePartItem(key: string) {
    setNewIssues(prev =>
      prev.map(issue => (issue.key === key ? { ...issue, partItems: [...issue.partItems, ''] } : issue))
    )
  }

  function removeNewIssuePartItem(key: string, index: number) {
    setNewIssues(prev =>
      prev.map(issue => {
        if (issue.key !== key || issue.partItems.length <= 1) return issue
        return { ...issue, partItems: issue.partItems.filter((_, i) => i !== index) }
      })
    )
  }

  function addExistingStyleIssue() {
    setNewIssues(prev => [
      ...prev,
      newIssueDraft(defaultReasonCode(reasons) || lines[0]?.reason || '', defaultDepartmentCode(departments) || lines[0]?.department || '')
    ])
  }

  async function saveAll() {
    if (!vehicle) return
    const ctx = vehicle
    const nextVin = normalizeVinKey(vin)
    if (!isValidVinLength(nextVin)) {
      setError(t('mp.errVinIndex', { n: 1 }))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    for (const line of changedLines) {
      const filled = filledPartItems(line.partItems)
      if (filled.length === 0) {
        setError(t('mp.edit.partRequired'))
        return
      }
      if (line.requiredQty < Math.max(1, line.part.installedQty)) {
        setError(t('mp.edit.qtyBelowInstalled'))
        return
      }
    }
    for (const issue of filledNewIssues) {
      if (filledPartItems(issue.partItems).length === 0) {
        setError(t('mp.edit.partRequired'))
        return
      }
    }
    for (let i = 0; i < extraVins.length; i++) {
      const raw = normalizeVinKey(extraVins[i])
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

    if (requireResolved(allNewVins, extraVins)) {
      setError(t('mp.edit.vinConflictTitle'))
      return
    }

    setBusy(true)
    setError('')
    try {
      const sharedNotes = notes.trim()

      for (const id of removedIds) {
        await deleteMissingPartRecord(id)
      }
      for (const id of clearPartIds(allNewVins)) {
        await deleteMissingPartRecord(id)
      }

      if (vinChanged || modelChanged || colorChanged) {
        await updateVehicle(ctx.vehicleId, {
          vin: nextVin,
          modelId,
          vehicleColorId: colorId
        })
      }

      for (const line of changedLines) {
        const filled = filledPartItems(line.partItems)
        await updateMissingPartRecord(line.part.id, {
          partDescription: filled[0],
          requiredQty: Math.max(1, line.requiredQty),
          reason: line.reason,
          department: line.department,
          priority: line.part.priority,
          stopperType: line.part.stopperType,
          notes: sharedNotes || line.notes,
          completingDepartment: line.completingDepartment || null,
          followUpEmployeeId: line.followUpEmployeeId || null,
          assignFollowUp: canAssignFollowUp
        })
      }

      // Apply shared notes to unchanged lines if notes edited.
      if (sharedNotes !== (openParts[0]?.notes ?? '').trim()) {
        for (const line of lines) {
          if (changedLines.some(c => c.part.id === line.part.id)) continue
          const filled = filledPartItems(line.partItems)
          await updateMissingPartRecord(line.part.id, {
            partDescription: filled[0] || line.part.partDescription,
            requiredQty: Math.max(1, line.requiredQty),
            reason: line.reason,
            department: line.department,
            priority: line.part.priority,
            stopperType: line.part.stopperType,
            notes: sharedNotes,
            completingDepartment: line.completingDepartment || null,
            followUpEmployeeId: line.followUpEmployeeId || null,
            assignFollowUp: canAssignFollowUp
          })
        }
      }

      const extraFromExisting = lines.flatMap(line => {
        const filled = filledPartItems(line.partItems)
        return filled.slice(1).map(partDescription => ({
          partDescription,
          requiredQty: 1,
          reason: line.reason,
          department: line.department,
          stationId: null as string | null,
          completingDepartment: line.completingDepartment || null,
          followUpEmployeeId: line.followUpEmployeeId || null
        }))
      })

      const newPartLines = [
        ...extraFromExisting,
        ...filledNewIssues.flatMap(i =>
          filledPartItems(i.partItems).map(partDescription => ({
            partDescription,
            requiredQty: 1,
            reason: i.reason,
            department: i.department,
            stationId: null as string | null,
            completingDepartment: i.completingDepartment || null,
            followUpEmployeeId: i.followUpEmployeeId || null
          }))
        )
      ]

      let reportGroupId = openParts.map(p => p.reportGroupId).find(Boolean) ?? null
      if (allNewVins.length > 0 && !reportGroupId) {
        reportGroupId = crypto.randomUUID()
        await attachMissingPartsToReportGroup(
          lines.map(l => l.part.id),
          reportGroupId
        )
      }

      if (newPartLines.length > 0) {
        await reportMissingPartsBatch({
          vins: [nextVin],
          modelId,
          parts: newPartLines,
          colorId,
          reason: newPartLines[0].reason,
          department: newPartLines[0].department,
          notes: sharedNotes || undefined,
          factoryOrgUnitId: ctx.parts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: reportGroupId ?? undefined
        })
      }

      if (allNewVins.length > 0) {
        const partsForNewVins = [
          ...lines.flatMap(l =>
            filledPartItems(l.partItems).map(partDescription => ({
              partDescription,
              requiredQty: 1,
              reason: l.reason,
              department: l.department,
              stationId: null as string | null,
              completingDepartment: l.completingDepartment || null,
              followUpEmployeeId: l.followUpEmployeeId || null
            }))
          ),
          ...filledNewIssues.flatMap(i =>
            filledPartItems(i.partItems).map(partDescription => ({
              partDescription,
              requiredQty: 1,
              reason: i.reason,
              department: i.department,
              stationId: null as string | null,
              completingDepartment: i.completingDepartment || null,
              followUpEmployeeId: i.followUpEmployeeId || null
            }))
          )
        ]
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
          factoryOrgUnitId: ctx.parts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: reportGroupId ?? undefined
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
    <>
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
                onChange={e => setVin(sanitizeChassisDigits(e.target.value))}
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

        <EditableVinList
          vins={extraVins}
          title={t('mp.edit.addVins')}
          hint={t('mp.edit.addVinsHint')}
          onAdd={() => setExtraVins(prev => [...prev, ''])}
          onChange={(i, next) => setExtraVins(prev => prev.map((x, idx) => (idx === i ? next : x)))}
          onRemove={i => setExtraVins(prev => prev.filter((_, idx) => idx !== i))}
          onVinReady={promptIfNeeded}
          onVinDiscarded={forgetDecision}
        />

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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-cyan-400/90">{t('mp.issueN', { n: idx + 1 })}</p>
                  <div className="flex items-center gap-1">
                    {canAssignFollowUp && (
                      <MpIssueFollowUpButton
                        assignment={{
                          completingDepartment: line.completingDepartment,
                          followUpEmployeeId: line.followUpEmployeeId
                        }}
                        employees={employees}
                        onSave={next =>
                          patchLine(line.part.id, {
                            completingDepartment: next.completingDepartment,
                            followUpEmployeeId: next.followUpEmployeeId
                          })
                        }
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingLine(line)}
                      className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <ReasonItemsField
                  items={line.partItems}
                  onUpdate={(index, value) => updateLinePartItem(line.part.id, index, value)}
                  onAdd={() => addLinePartItem(line.part.id)}
                  onRemove={index => removeLinePartItem(line.part.id, index)}
                />
                <MpIssueLookupsFields
                  department={line.department}
                  reason={line.reason}
                  orgUnits={orgUnits}
                  reasons={reasons}
                  onDepartmentChange={department => patchLine(line.part.id, { department })}
                  onReasonChange={code => patchLine(line.part.id, { reason: code })}
                  onCreateReason={addReason}
                />
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
                    <div className="flex items-center gap-1">
                      {canAssignFollowUp && (
                        <MpIssueFollowUpButton
                          assignment={{
                            completingDepartment: issue.completingDepartment,
                            followUpEmployeeId: issue.followUpEmployeeId
                          }}
                          employees={employees}
                          onSave={next =>
                            setNewIssues(prev =>
                              prev.map(x =>
                                x.key === issue.key
                                  ? {
                                      ...x,
                                      completingDepartment: next.completingDepartment,
                                      followUpEmployeeId: next.followUpEmployeeId
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setNewIssues(prev => prev.filter(x => x.key !== issue.key))}
                        className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <ReasonItemsField
                    items={issue.partItems}
                    onUpdate={(index, value) => updateNewIssuePartItem(issue.key, index, value)}
                    onAdd={() => addNewIssuePartItem(issue.key)}
                    onRemove={index => removeNewIssuePartItem(issue.key, index)}
                  />
                  <MpIssueLookupsFields
                    department={issue.department}
                    reason={issue.reason}
                    orgUnits={orgUnits}
                    reasons={reasons}
                    onDepartmentChange={department =>
                      setNewIssues(prev => prev.map(x => (x.key === issue.key ? { ...x, department } : x)))
                    }
                    onReasonChange={code =>
                      setNewIssues(prev => prev.map(x => (x.key === issue.key ? { ...x, reason: code } : x)))
                    }
                    onCreateReason={addReason}
                  />
              </div>
            ))}
          </div>
        </section>

        <Field label={t('mp.f.notes')}>
          <textarea className="input-dark w-full" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
      </div>
    </Modal>
    <VinConflictDialog
      vin={conflictVin}
      onChoose={choice => chooseVinConflict(choice, i => setExtraVins(prev => prev.filter((_, idx) => idx !== i)))}
    />
    </>
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

function ReasonItemsField({
  items,
  onUpdate,
  onAdd,
  onRemove
}: {
  items: string[]
  onUpdate: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const { t } = useLang()
  return (
    <Field label={t('mp.cols.reason')} required>
      <div className="space-y-2">
        {items.map((item, pi) => (
          <div key={pi} className="flex gap-2">
            <input
              className="input-dark min-w-0 flex-1"
              value={item}
              onChange={e => onUpdate(pi, e.target.value)}
              placeholder={t('mp.issueReasonPlaceholder')}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(pi)}
                className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 hover:bg-red-500/20"
                title={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {pi === items.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                className="shrink-0 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 hover:bg-cyan-500/20"
                title={t('mp.addReasonLine')}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <p className="text-[10px] text-slate-500">{t('mp.reasonItemsHint')}</p>
      </div>
    </Field>
  )
}
