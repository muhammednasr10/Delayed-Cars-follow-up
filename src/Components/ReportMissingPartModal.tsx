import { AlertTriangle, Plus } from 'lucide-react'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { VehicleCardModal } from './missingParts/VehicleCardModal'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { Field } from './reportMissingPart/Field'
import { VinInputSection } from './reportMissingPart/VinInputSection'
import { IssueLineCard } from './reportMissingPart/IssueLineCard'
import { useReportMissingPartForm } from './reportMissingPart/useReportMissingPartForm'

type Props = {
  open: boolean
  onClose: () => void
  onReported?: (summary?: string) => void
}

export function ReportMissingPartModal({ open, onClose, onReported }: Props) {
  const form = useReportMissingPartForm(open, onClose, onReported)
  const { t } = form

  return (
    <>
    <Modal
      open={open}
      title={t('mp.reportTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="w-full space-y-3">
          {form.formError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {form.formError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={form.submitting}
              onClick={() => void form.submit()}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {form.submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionOrg')}</h3>
          <p className="text-xs text-slate-500">{t('mp.orgAutoHint')}</p>
          {form.scopeLabel ? (
            <p className="text-sm font-bold text-white">{form.scopeLabel}</p>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
              {t('mp.errNoOrgUnit')}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionVehicle')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <VehicleModelFamilyPicker
                models={form.models}
                familyId={form.vehicle.familyId}
                variantId={form.vehicle.modelId}
                loading={form.listsLoading}
                onFamilyChange={familyId => form.setVehicle(p => ({ ...p, familyId, modelId: '' }))}
                onVariantChange={modelId => {
                  form.setConfirmedExistingVins(new Set())
                  form.setVehicle(p => ({
                    ...p,
                    modelId,
                    familyId: resolveFamilyIdForVariant(form.models, modelId) || p.familyId
                  }))
                }}
              />
            </div>
            <Field label={t('mp.f.color')}>
              {form.listsLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : form.colors.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  {t('mp.noColorsInSettings')}
                </p>
              ) : (
                <select
                  className="input-dark"
                  value={form.vehicle.colorId ?? ''}
                  onChange={e => form.setVehicle(p => ({ ...p, colorId: e.target.value || null }))}
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
            <Field label={t('mp.f.vehicleCount')} required>
              <input
                type="number"
                min={1}
                max={20}
                className="input-dark"
                value={form.vehicleCountDraft}
                onChange={e => form.onVehicleCountChange(e.target.value)}
                onBlur={form.onVehicleCountBlur}
              />
            </Field>
          </div>
          <VinInputSection
            vehicle={form.vehicle}
            duplicateVinIdx={form.duplicateVinIdx}
            hasConfirmedExisting={form.hasConfirmedExisting}
            updateVehicleVin={form.updateVehicleVin}
            checkVinDuplicate={idx => void form.checkVinDuplicate(idx)}
          />
        </section>

        <section ref={form.issuesSectionRef} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">{t('mp.sectionIssues')}</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">{t('mp.sectionIssuesHint')}</p>
            </div>
            <button
              type="button"
              onClick={form.addIssue}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> {t('mp.addIssueLine')}
            </button>
          </div>

          <div className="space-y-3">
            {form.issues.map((line, idx) => (
              <IssueLineCard
                key={line.key}
                line={line}
                index={idx}
                issueCount={form.issues.length}
                stockShortage={form.isStockShortageReason(line.reason)}
                orgUnits={form.orgUnits}
                reasons={form.reasons}
                employees={form.employees}
                canAssignFollowUp={form.canAssignFollowUp}
                onPatchIssue={form.patchIssue}
                onPatchIssueReason={form.patchIssueReason}
                onUpdatePartItem={form.updatePartItem}
                onAddPartItem={form.addPartItem}
                onRemovePartItem={form.removePartItem}
                onRemoveIssue={form.removeIssue}
                onCreateReason={form.addReason}
              />
            ))}
          </div>

          {form.totalRecords > 0 && (
            <p className="text-[10px] text-slate-500">{t('mp.batchHintTotal', { total: form.totalRecords })}</p>
          )}
        </section>

        <section>
          <Field label={t('mp.f.notes')}>
            <textarea
              className="input-dark min-h-16"
              value={form.vehicle.notes}
              onChange={e => form.setVehicle(p => ({ ...p, notes: e.target.value }))}
            />
          </Field>
        </section>
      </div>
    </Modal>

    <ConfirmDialog
      open={Boolean(form.duplicatePrompt)}
      title={t('mp.duplicateVehicleTitle')}
      message={
        form.duplicatePrompt
          ? [form.duplicateMessage(form.duplicatePrompt), form.existingViewError].filter(Boolean).join('\n\n')
          : ''
      }
      confirmLabel={t('mp.duplicateVehicleYes')}
      cancelLabel={t('mp.duplicateVehicleNo')}
      extraLabel={t('mp.duplicateVehicleView')}
      extraBusy={form.existingVehicleLoading}
      extraBusyLabel={t('common.loading')}
      tone="default"
      busy={form.submitting}
      onConfirm={form.confirmAddToExisting}
      onCancel={form.cancelAddToExisting}
      onExtra={() => void form.viewExistingVehicle()}
    />
    <VehicleCardModal
      parts={form.existingVehicleParts}
      zIndexClass="z-[220]"
      onClose={() => form.setExistingVehicleParts(null)}
    />
    </>
  )
}
