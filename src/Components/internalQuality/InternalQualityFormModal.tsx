import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { VehicleModelMultiSelect } from '../VehicleModelMultiSelect'
import type { VehicleModel } from '../../Types/settings'
import type { InternalQualityIssue, InternalQualityIssueInput } from '../../Types/internalQuality'

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function emptyForm(): InternalQualityIssueInput {
  return {
    problemType: '',
    problem: '',
    reportingWorkshop: '',
    vehicleModelIds: [],
    firstReportedAt: todayIso()
  }
}

type Props = {
  open: boolean
  editing: InternalQualityIssue | null
  models: VehicleModel[]
  onClose: () => void
  onSave: (input: InternalQualityIssueInput) => void
  saving?: boolean
}

export function InternalQualityFormModal({ open, editing, models, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<InternalQualityIssueInput>(emptyForm())
  const [linkedToModels, setLinkedToModels] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        problemType: editing.problemType,
        problem: editing.problem,
        reportingWorkshop: editing.reportingWorkshop,
        vehicleModelIds: editing.vehicleModelIds,
        firstReportedAt: editing.firstReportedAt.slice(0, 10)
      })
      setLinkedToModels(editing.vehicleModelIds.length > 0)
    } else {
      setForm(emptyForm())
      setLinkedToModels(false)
    }
    setError('')
  }, [open, editing])

  function submit() {
    if (!form.problemType.trim()) {
      setError(t('internalQuality.errType'))
      return
    }
    if (!form.problem.trim()) {
      setError(t('internalQuality.errProblem'))
      return
    }
    if (!form.reportingWorkshop.trim()) {
      setError(t('internalQuality.errWorkshop'))
      return
    }
    if (!form.firstReportedAt) {
      setError(t('internalQuality.errDate'))
      return
    }
    if (linkedToModels && form.vehicleModelIds.length === 0) {
      setError(t('internalQuality.errModels'))
      return
    }
    onSave({
      problemType: form.problemType.trim(),
      problem: form.problem.trim(),
      reportingWorkshop: form.reportingWorkshop.trim(),
      vehicleModelIds: linkedToModels ? form.vehicleModelIds : [],
      firstReportedAt: form.firstReportedAt
    })
  }

  return (
    <Modal
      open={open}
      title={editing ? t('internalQuality.editTitle') : t('internalQuality.addTitle')}
      icon={<ClipboardList className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-teal-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        <Field label={t('internalQuality.cols.problemType')} required>
          <input
            className={inputCls()}
            value={form.problemType}
            onChange={e => setForm(f => ({ ...f, problemType: e.target.value }))}
            placeholder={t('internalQuality.problemTypePh')}
          />
        </Field>
        <Field label={t('internalQuality.cols.problem')} required>
          <textarea
            className={`${inputCls()} min-h-[5rem] resize-y`}
            value={form.problem}
            onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
            placeholder={t('internalQuality.problemPh')}
          />
        </Field>
        <Field label={t('internalQuality.cols.workshop')} required>
          <input
            className={inputCls()}
            value={form.reportingWorkshop}
            onChange={e => setForm(f => ({ ...f, reportingWorkshop: e.target.value }))}
            placeholder={t('internalQuality.workshopPh')}
          />
        </Field>
        <Field label={t('internalQuality.cols.firstReported')} required>
          <input
            type="date"
            className={inputCls()}
            dir="ltr"
            value={form.firstReportedAt}
            onChange={e => setForm(f => ({ ...f, firstReportedAt: e.target.value }))}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-teal-500"
            checked={linkedToModels}
            onChange={e => {
              const next = e.target.checked
              setLinkedToModels(next)
              if (!next) setForm(f => ({ ...f, vehicleModelIds: [] }))
            }}
          />
          {t('internalQuality.linkedModels')}
        </label>

        {linkedToModels && (
          <Field label={t('internalQuality.cols.models')} required>
            <VehicleModelMultiSelect
              models={models}
              value={form.vehicleModelIds}
              onChange={vehicleModelIds => setForm(f => ({ ...f, vehicleModelIds }))}
              placeholder={t('internalQuality.modelsPh')}
            />
          </Field>
        )}
      </div>
    </Modal>
  )
}
