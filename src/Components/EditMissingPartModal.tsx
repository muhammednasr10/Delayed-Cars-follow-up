import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { EditableVinList } from './EditableVinList'
import { VinConflictDialog } from './VinConflictDialog'
import { MpIssueLookupsFields } from './missingParts/MpIssueLookupsFields'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { ReasonItemsField } from './missingParts/ReasonItemsField'
import { Field } from './missingParts/Field'
import { useEditMissingPartForm } from '../hooks/useEditMissingPartForm'
import { sanitizeChassisDigits } from '../Utils/vinListConflict'
import type { VehicleIssuesContext } from '../Types/missingPart'
import type { MissingPartDetail } from '../Types/missingPart'

type Props = {
  vehicle: VehicleIssuesContext | null
  activeListParts?: MissingPartDetail[]
  onClose: () => void
  onSaved: () => void
}

export function EditMissingPartModal({ vehicle, activeListParts = [], onClose, onSaved }: Props) {
  const { t } = useLang()
  const form = useEditMissingPartForm({ vehicle, activeListParts, onSaved, onClose })

  if (!vehicle) return null

  return (
    <>
    <Modal
      open={Boolean(vehicle)}
      title={t('mp.edit.vehicleTitle')}
      subtitle={t('mp.act.vehicleIssues', { n: form.openParts.length + form.filledNewIssues.length })}
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
            disabled={form.busy || !form.hasChanges}
            onClick={() => void form.saveAll()}
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
                value={form.vin}
                onChange={e => form.setVin(sanitizeChassisDigits(e.target.value))}
                placeholder="0000"
              />
            </Field>
            <Field label={t('mp.f.color')}>
              {form.listsLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : (
                <select
                  className="input-dark"
                  value={form.colorId ?? ''}
                  onChange={e => form.setColorId(e.target.value || null)}
                >
                  <option value="">—</option>
                  {form.colors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="sm:col-span-2">
              <VehicleModelFamilyPicker
                models={form.models}
                familyId={form.familyId}
                variantId={form.modelId}
                loading={form.listsLoading}
                onFamilyChange={id => {
                  form.setFamilyId(id)
                  form.setModelId('')
                }}
                onVariantChange={id => {
                  form.setModelId(id)
                  form.setFamilyId(resolveFamilyIdForVariant(form.models, id) || form.familyId)
                }}
              />
            </div>
          </div>
        </section>

        <EditableVinList
          vins={form.extraVins}
          title={t('mp.edit.addVins')}
          hint={t('mp.edit.addVinsHint')}
          onAdd={() => form.setExtraVins(prev => [...prev, ''])}
          onChange={(i, next) => form.setExtraVins(prev => prev.map((x, idx) => (idx === i ? next : x)))}
          onRemove={i => form.setExtraVins(prev => prev.filter((_, idx) => idx !== i))}
          onVinReady={form.vinConflict.promptIfNeeded}
          onVinDiscarded={form.vinConflict.forgetDecision}
        />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
            <button
              type="button"
              onClick={form.addExistingStyleIssue}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
            </button>
          </div>

          <div className="max-h-[min(40vh,360px)] space-y-3 overflow-y-auto pe-1">
            {form.lines.map((line, idx) => (
              <div key={line.part.id} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-cyan-400/90">{t('mp.issueN', { n: idx + 1 })}</p>
                  <button
                    type="button"
                    onClick={() => form.removeExistingLine(line)}
                    className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ReasonItemsField
                  items={line.partItems}
                  onUpdate={(index, value) => form.updateLinePartItem(line.part.id, index, value)}
                  onAdd={() => form.addLinePartItem(line.part.id)}
                  onRemove={index => form.removeLinePartItem(line.part.id, index)}
                />
                <MpIssueLookupsFields
                  department={line.department}
                  reason={line.reason}
                  completingDepartment={line.completingDepartment}
                  orgUnits={form.orgUnits}
                  reasons={form.reasons}
                  showCompletingDepartment
                  onDepartmentChange={department => form.patchLine(line.part.id, { department })}
                  onReasonChange={code => form.patchLine(line.part.id, { reason: code })}
                  onCompletingDepartmentChange={completingDepartment =>
                    form.patchLine(line.part.id, { completingDepartment })
                  }
                  onCreateReason={form.addReason}
                  showFollowUpEmployees={form.canAssignFollowUp}
                  employees={form.employees}
                  followUpEmployeeIds={line.followUpEmployeeIds}
                  onFollowUpEmployeeIdsChange={followUpEmployeeIds =>
                    form.patchLine(line.part.id, { followUpEmployeeIds })
                  }
                />
                <Field label={t('mp.cols.qty')}>
                  <input
                    type="number"
                    min={Math.max(1, line.part.installedQty)}
                    className="input-dark w-full"
                    value={line.requiredQty}
                    onChange={e => form.patchLine(line.part.id, { requiredQty: Number(e.target.value) })}
                  />
                </Field>
              </div>
            ))}

            {form.newIssues.map((issue, idx) => (
              <div key={issue.key} className="space-y-2 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-cyan-300">
                      {t('mp.edit.newIssue')} · {t('mp.issueN', { n: form.lines.length + idx + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => form.removeNewIssue(issue.key)}
                      className="rounded-lg bg-red-500/15 p-1.5 text-red-200 hover:bg-red-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ReasonItemsField
                    items={issue.partItems}
                    onUpdate={(index, value) => form.updateNewIssuePartItem(issue.key, index, value)}
                    onAdd={() => form.addNewIssuePartItem(issue.key)}
                    onRemove={index => form.removeNewIssuePartItem(issue.key, index)}
                  />
                  <MpIssueLookupsFields
                    department={issue.department}
                    reason={issue.reason}
                    completingDepartment={issue.completingDepartment}
                    orgUnits={form.orgUnits}
                    reasons={form.reasons}
                    showCompletingDepartment
                    onDepartmentChange={department => form.patchNewIssue(issue.key, { department })}
                    onReasonChange={code => form.patchNewIssue(issue.key, { reason: code })}
                    onCompletingDepartmentChange={completingDepartment =>
                      form.patchNewIssue(issue.key, { completingDepartment })
                    }
                    onCreateReason={form.addReason}
                    showFollowUpEmployees={form.canAssignFollowUp}
                    employees={form.employees}
                    followUpEmployeeIds={issue.followUpEmployeeIds}
                    onFollowUpEmployeeIdsChange={followUpEmployeeIds =>
                      form.patchNewIssue(issue.key, { followUpEmployeeIds })
                    }
                  />
              </div>
            ))}
          </div>
        </section>

        <Field label={t('mp.f.notes')}>
          <textarea className="input-dark w-full" rows={2} value={form.notes} onChange={e => form.setNotes(e.target.value)} />
        </Field>

        {form.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{form.error}</div>
        )}
      </div>
    </Modal>
    <VinConflictDialog
      vin={form.vinConflict.conflictVin}
      onChoose={choice => form.vinConflict.choose(choice, i => form.setExtraVins(prev => prev.filter((_, idx) => idx !== i)))}
    />
    </>
  )
}
