import { useEffect, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import type { ScratchInput, ScratchSeverity } from '../../Types/scratch'

const SEVERITIES: ScratchSeverity[] = ['light', 'medium', 'severe']

function emptyForm(): ScratchInput {
  return {
    vin: '',
    bodyArea: '',
    severity: 'light',
    recordedAt: new Date().toISOString().slice(0, 10),
    notes: ''
  }
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (input: ScratchInput) => void
  saving?: boolean
}

export function ScratchFormModal({ open, onClose, onSave, saving }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState<ScratchInput>(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(emptyForm())
      setError('')
    }
  }, [open])

  function validate(): string | null {
    if (form.vin.trim().length < 4) return t('scratches.errVin')
    if (!form.bodyArea.trim()) return t('scratches.errArea')
    if (!form.recordedAt) return t('scratches.errDate')
    return null
  }

  function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave({
      ...form,
      vin: form.vin.trim().toUpperCase(),
      bodyArea: form.bodyArea.trim(),
      notes: form.notes?.trim() || undefined
    })
  }

  return (
    <Modal
      open={open}
      title={t('scratches.formTitle')}
      subtitle={t('scratches.formSubtitle')}
      icon={<ScanLine className="h-5 w-5" />}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-black text-white hover:bg-rose-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <Field label={t('scratches.cols.vin')} required>
          <input
            className={inputCls()}
            value={form.vin}
            onChange={e => setForm(f => ({ ...f, vin: e.target.value }))}
            placeholder={t('scratches.vinPlaceholder')}
          />
        </Field>

        <Field label={t('scratches.cols.area')} required>
          <input
            className={inputCls()}
            value={form.bodyArea}
            onChange={e => setForm(f => ({ ...f, bodyArea: e.target.value }))}
            placeholder={t('scratches.areaPlaceholder')}
          />
        </Field>

        <Field label={t('scratches.cols.severity')} required>
          <select
            className={inputCls()}
            value={form.severity}
            onChange={e => setForm(f => ({ ...f, severity: e.target.value as ScratchSeverity }))}
          >
            {SEVERITIES.map(key => (
              <option key={key} value={key}>
                {t(`scratches.severity.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('scratches.cols.date')} required>
          <input
            type="date"
            className={inputCls()}
            value={form.recordedAt}
            onChange={e => setForm(f => ({ ...f, recordedAt: e.target.value }))}
          />
        </Field>

        <Field label={t('common.notes')}>
          <textarea
            className={`${inputCls()} min-h-[5rem] resize-y`}
            value={form.notes ?? ''}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  )
}
