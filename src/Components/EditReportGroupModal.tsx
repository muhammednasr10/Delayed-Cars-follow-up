import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { EditableVinList } from './EditableVinList'
import { VinConflictDialog } from './VinConflictDialog'
import { reportMissingPartsBatch, updateMissingPartRecord, deleteMissingPartRecord } from '../services/missingPartsService'
import { updateVehicle } from '../services/vehiclesService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { MissingPartDetail, ReportGroupContext } from '../Types/missingPart'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import { useMpLookups } from '../hooks/useMpLookups'
import { useEmployees } from '../hooks/useEmployees'
import { useMissingPartsUiPermissions } from '../hooks/useMissingPartsUiPermissions'
import { useFormatError } from '../hooks/useFormatError'
import { useVinListConflict } from '../hooks/useVinListConflict'
import { MpIssueLookupsFields } from './missingParts/MpIssueLookupsFields'
import { MpIssueFollowUpButton } from './missingParts/MpIssueFollowUpButton'
import { defaultDepartmentCode, defaultReasonCode } from '../Utils/mpLookupLabel'
import { isValidVinLength } from '../Utils/vinValidation'
import { normalizeVinKey, vinInActiveList } from '../Utils/vinListConflict'
import { uniqueIssueReps } from '../Utils/missingPartPageUtils'

type Props = {
  group: ReportGroupContext | null
  activeListParts?: MissingPartDetail[]
  onClose: () => void
  onSaved: () => void
}

type IssueDraft = {
  key: string
  ids: string[]
  partDescription: string
  reason: string
  department: string
  completingDepartment: string
  followUpEmployeeId: string
  isNew?: boolean
}

type VinRow = {
  key: string
  vin: string
  /** VIN this row started as; null = newly added in this edit session. */
  originalVin: string | null
  vehicleId: string | null
}

function buildVinRows(parts: MissingPartDetail[]): VinRow[] {
  const seen = new Set<string>()
  const rows: VinRow[] = []
  for (const p of [...parts].sort((a, b) => a.vin.localeCompare(b.vin))) {
    const key = normalizeVinKey(p.vin)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push({
      key: p.vehicleId || key,
      vin: p.vin,
      originalVin: p.vin,
      vehicleId: p.vehicleId
    })
  }
  return rows
}

export function EditReportGroupModal({ group, activeListParts = [], onClose, onSaved }: Props) {
  const { t } = useLang()
  const { reasons, departments, orgUnits, addReason } = useMpLookups()
  const { employees } = useEmployees()
  const { canAssignFollowUp } = useMissingPartsUiPermissions()
  const formatError = useFormatError()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [modelId, setModelId] = useState('')
  const [colorId, setColorId] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueDraft[]>([])
  const [vinRows, setVinRows] = useState<VinRow[]>([])
  const [notes, setNotes] = useState('')
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const editableParts = useMemo(
    () => group?.parts.filter(p => group.allowArchived || (p.status !== 'closed' && p.status !== 'cancelled')) ?? [],
    [group]
  )

  const removedIdSet = useMemo(() => new Set(removedIds), [removedIds])
  const ownedPartIds = useMemo(
    () => new Set(editableParts.filter(p => !removedIdSet.has(p.id)).map(p => p.id)),
    [editableParts, removedIdSet]
  )
  const ownedVins = useMemo(
    () => new Set(editableParts.filter(p => !removedIdSet.has(p.id)).map(p => normalizeVinKey(p.vin))),
    [editableParts, removedIdSet]
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
    if (!group) return
    const reps = uniqueIssueReps(editableParts)
    setIssues(
      reps.map(rep => ({
        key: rep.id,
        ids: editableParts
          .filter(
            p =>
              p.partDescription === rep.partDescription &&
              p.reason === rep.reason &&
              p.department === rep.department
          )
          .map(p => p.id),
        partDescription: rep.partDescription,
        reason: rep.reason,
        department: rep.department,
        completingDepartment: rep.completingDepartment ?? '',
        followUpEmployeeId: rep.followUpEmployeeId ?? ''
      }))
    )
    setVinRows(buildVinRows(editableParts))
    setNotes(editableParts[0]?.notes ?? '')
    setRemovedIds([])
    resetVinConflicts()
    setError('')
    Promise.all([getVehicleModels(), getVehicleColors()])
      .then(([m, c]) => {
        setModels(m)
        setColors(c)
        const byName = m.find(x => x.name === group.modelName && x.model_kind === 'variant')
          ?? m.find(x => x.name === group.modelName)
        setModelId(byName?.id ?? '')
        const color = c.find(x => x.name === group.colorName)
        setColorId(color?.id ?? null)
      })
      .catch(err => setError(formatError(err)))
  }, [group, editableParts, formatError, resetVinConflicts])

  if (!group) return null

  const vins = vinRows.map(r => r.vin)
  const normalizedVins = vinRows.map(r => normalizeVinKey(r.vin)).filter(Boolean)
  const keptOriginalKeys = new Set(
    vinRows.filter(r => r.originalVin).map(r => normalizeVinKey(r.originalVin!))
  )
  const renamedRows = vinRows.filter(
    r => r.originalVin && r.vehicleId && normalizeVinKey(r.vin) !== normalizeVinKey(r.originalVin)
  )
  const addedRows = vinRows.filter(r => !r.originalVin)
  const newVins = addedRows.map(r => normalizeVinKey(r.vin)).filter(isValidVinLength)
  const remainingOriginalVins = vinRows
    .filter(r => r.originalVin)
    .map(r => normalizeVinKey(r.vin))
    .filter(isValidVinLength)
  const existingIssues = issues.filter(i => !i.isNew)
  const newIssues = issues.filter(i => i.isNew && i.partDescription.trim())

  function patchIssue(key: string, patch: Partial<IssueDraft>) {
    setIssues(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))
  }

  function removeIssue(issue: IssueDraft) {
    if (!window.confirm(t('mp.deleteConfirm', { part: issue.partDescription || '—' }))) return
    if (issue.ids.length > 0) setRemovedIds(prev => [...prev, ...issue.ids])
    setIssues(prev => prev.filter(i => i.key !== issue.key))
  }

  function removeVinAt(index: number) {
    const row = vinRows[index]
    if (!row) return
    if (vinRows.length <= 1) {
      setError(t('mp.edit.needOneVin'))
      return
    }
    if (row.originalVin) {
      const label = normalizeVinKey(row.originalVin) || row.originalVin
      if (!window.confirm(t('mp.edit.removeVinConfirm', { vin: label }))) return
      const partIds = editableParts
        .filter(p => normalizeVinKey(p.vin) === normalizeVinKey(row.originalVin!))
        .map(p => p.id)
      setRemovedIds(prev => [...prev, ...partIds.filter(id => !prev.includes(id))])
      setIssues(prev =>
        prev.map(i => ({
          ...i,
          ids: i.ids.filter(id => !partIds.includes(id))
        }))
      )
    }
    forgetDecision(normalizeVinKey(row.vin))
    setVinRows(prev => prev.filter((_, i) => i !== index))
  }

  async function save() {
    if (!group) return
    const ctx = group
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    if (vinRows.length === 0) {
      setError(t('mp.edit.needOneVin'))
      return
    }
    for (let i = 0; i < normalizedVins.length; i++) {
      if (!isValidVinLength(normalizedVins[i])) {
        setError(t('mp.errVinIndex', { n: i + 1 }))
        return
      }
    }
    if (new Set(normalizedVins).size !== normalizedVins.length) {
      setError(t('mp.errDuplicateVin'))
      return
    }
    for (const issue of issues) {
      if (!issue.partDescription.trim()) {
        setError(t('mp.edit.partRequired'))
        return
      }
    }

    const conflictCandidates = normalizedVins.filter(v => vinInActiveList(v, activeListParts, ownedPartIds))
    if (requireResolved(conflictCandidates, vins)) {
      setError(t('mp.edit.vinConflictTitle'))
      return
    }

    setBusy(true)
    setError('')
    try {
      for (const id of removedIds) {
        await deleteMissingPartRecord(id)
      }
      for (const id of clearPartIds(conflictCandidates)) {
        if (removedIdSet.has(id) || ownedPartIds.has(id)) continue
        await deleteMissingPartRecord(id)
      }

      for (const row of renamedRows) {
        await updateVehicle(row.vehicleId!, {
          vin: normalizeVinKey(row.vin),
          modelId,
          vehicleColorId: colorId
        })
      }

      for (const issue of existingIssues) {
        for (const id of issue.ids) {
          if (removedIdSet.has(id)) continue
          const part = editableParts.find(p => p.id === id)
          if (!part) continue
          // Skip parts belonging to deleted original VINs
          if (part.vin && !keptOriginalKeys.has(normalizeVinKey(part.vin))) continue
          await updateMissingPartRecord(id, {
            partDescription: issue.partDescription.trim(),
            requiredQty: part.requiredQty,
            reason: issue.reason,
            department: issue.department,
            priority: part.priority,
            stopperType: part.stopperType,
            notes,
            completingDepartment: issue.completingDepartment || null,
            followUpEmployeeId: issue.followUpEmployeeId || null,
            assignFollowUp: canAssignFollowUp
          })
        }
      }

      const newPartLines = newIssues.map(i => ({
        partDescription: i.partDescription.trim(),
        requiredQty: 1,
        reason: i.reason,
        department: i.department,
        stationId: null as string | null,
        completingDepartment: i.completingDepartment || null,
        followUpEmployeeId: i.followUpEmployeeId || null
      }))

      if (newPartLines.length > 0 && remainingOriginalVins.length > 0) {
        await reportMissingPartsBatch({
          vins: remainingOriginalVins,
          modelId,
          parts: newPartLines,
          colorId,
          reason: newPartLines[0].reason,
          department: newPartLines[0].department,
          notes: notes || undefined,
          factoryOrgUnitId: editableParts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: ctx.reportGroupId
        })
      }

      if (newVins.length > 0) {
        const partsForNew = [
          ...existingIssues.map(i => ({
            partDescription: i.partDescription.trim(),
            requiredQty: 1,
            reason: i.reason,
            department: i.department,
            stationId: null as string | null,
            completingDepartment: i.completingDepartment || null,
            followUpEmployeeId: i.followUpEmployeeId || null
          })),
          ...newPartLines
        ]
        if (partsForNew.length === 0) {
          setError(t('mp.edit.needIssueForNewVin'))
          setBusy(false)
          return
        }
        await reportMissingPartsBatch({
          vins: newVins,
          modelId,
          parts: partsForNew,
          colorId,
          reason: partsForNew[0].reason,
          department: partsForNew[0].department,
          notes: notes || undefined,
          factoryOrgUnitId: editableParts[0]?.factoryOrgUnitId ?? undefined,
          reportGroupId: ctx.reportGroupId
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
        open={Boolean(group)}
        title={t('mp.edit.groupTitle')}
        subtitle={t('mp.act.vehicleIssues', { n: issues.length })}
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
              disabled={busy}
              onClick={() => void save()}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {t('mp.edit.saveAll')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
              <span>{group.modelName}</span>
              {group.colorName && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500"
                    style={{ backgroundColor: group.colorHex ?? '#fff' }}
                  />
                  {group.colorName}
                </span>
              )}
            </div>
            {colors.length > 0 && (
              <div className="mx-auto mt-3 max-w-xs text-start">
                <Field label={t('mp.f.color')}>
                  <select className="input-dark" value={colorId ?? ''} onChange={e => setColorId(e.target.value || null)}>
                    <option value="">—</option>
                    {colors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </div>

          <EditableVinList
            vins={vins}
            title={t('mp.vinListTitle')}
            hint={t('mp.edit.addVinsHint')}
            onAdd={() =>
              setVinRows(prev => [
                ...prev,
                { key: crypto.randomUUID(), vin: '', originalVin: null, vehicleId: null }
              ])
            }
            onChange={(i, next) =>
              setVinRows(prev => prev.map((row, idx) => (idx === i ? { ...row, vin: next } : row)))
            }
            onRemove={removeVinAt}
            onVinReady={promptIfNeeded}
            onVinDiscarded={forgetDecision}
          />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
              <button
                type="button"
                onClick={() =>
                  setIssues(prev => [
                    ...prev,
                    {
                      key: crypto.randomUUID(),
                      ids: [],
                      partDescription: '',
                      reason: defaultReasonCode(reasons) || prev[0]?.reason || '',
                      department: defaultDepartmentCode(departments) || prev[0]?.department || '',
                      completingDepartment: '',
                      followUpEmployeeId: '',
                      isNew: true
                    }
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
              </button>
            </div>

            <div className="max-h-[min(40vh,360px)] space-y-3 overflow-y-auto pe-1">
              {issues.map((issue, idx) => (
                <div
                  key={issue.key}
                  className={`space-y-2 rounded-xl border p-3 ${
                    issue.isNew ? 'border-dashed border-cyan-500/40 bg-cyan-500/5' : 'border-slate-700 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-cyan-400/90">
                      {issue.isNew ? t('mp.edit.newIssue') : t('mp.issueN', { n: idx + 1 })}
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
                            patchIssue(issue.key, {
                              completingDepartment: next.completingDepartment,
                              followUpEmployeeId: next.followUpEmployeeId
                            })
                          }
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeIssue(issue)}
                        className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <Field label={t('mp.cols.reason')} required>
                    <input
                      className="input-dark w-full"
                      value={issue.partDescription}
                      onChange={e => patchIssue(issue.key, { partDescription: e.target.value })}
                      placeholder={t('mp.issueReasonPlaceholder')}
                    />
                  </Field>
                  <MpIssueLookupsFields
                    department={issue.department}
                    reason={issue.reason}
                    orgUnits={orgUnits}
                    reasons={reasons}
                    onDepartmentChange={department => patchIssue(issue.key, { department })}
                    onReasonChange={code => patchIssue(issue.key, { reason: code })}
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
          {!modelId && models.length > 0 && (
            <p className="text-xs text-amber-300">{t('mp.edit.modelResolveHint')}</p>
          )}
        </div>
      </Modal>

      <VinConflictDialog
        vin={conflictVin}
        onChoose={choice =>
          chooseVinConflict(choice, i => {
            const row = vinRows[i]
            if (row?.originalVin) {
              // Skip on an existing row: revert to original VIN instead of deleting the row.
              setVinRows(prev =>
                prev.map((r, idx) => (idx === i ? { ...r, vin: r.originalVin ?? '' } : r))
              )
              return
            }
            setVinRows(prev => prev.filter((_, idx) => idx !== i))
          })
        }
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
