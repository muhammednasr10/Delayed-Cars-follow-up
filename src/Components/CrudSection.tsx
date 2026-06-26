import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'

export type CrudValues = Record<string, string>

export type CrudField = {
  key: string
  label: string
  type?: 'text' | 'color' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
  defaultValue?: string
}

export type CrudColumn<T> = { header: string; render: (item: T) => ReactNode; className?: string }

export type CrudSectionProps<T> = {
  title: string
  icon: ReactNode
  items: T[]
  busy: boolean
  fields: CrudField[]
  columns: CrudColumn<T>[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  toValues: (item: T) => CrudValues
  onCreate: (values: CrudValues) => Promise<boolean>
  onUpdate: (id: string, values: CrudValues) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  canManage?: boolean
  getCreateValues?: (items: T[]) => CrudValues
  renderWizard?: (args: {
    open: boolean
    mode: 'create' | 'edit'
    initialValues: CrudValues
    busy: boolean
    onClose: () => void
    onSubmit: (values: CrudValues) => Promise<boolean>
  }) => ReactNode
}

function emptyValues(fields: CrudField[]): CrudValues {
  return fields.reduce<CrudValues>((acc, field) => {
    acc[field.key] = field.defaultValue ?? ''
    return acc
  }, {})
}

export function CrudSection<T>({
  title,
  icon,
  items,
  busy,
  fields,
  columns,
  getId,
  getLabel,
  toValues,
  onCreate,
  onUpdate,
  onDelete,
  canManage = true,
  getCreateValues,
  renderWizard
}: CrudSectionProps<T>) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<CrudValues>(emptyValues(fields))
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)

  function openAdd() {
    setEditingId(null)
    setValues(getCreateValues ? getCreateValues(items) : emptyValues(fields))
    setFormError('')
    setFieldErrors({})
    setFormOpen(true)
  }

  function openEdit(item: T) {
    setEditingId(getId(item))
    setValues(toValues(item))
    setFormError('')
    setFieldErrors({})
    setFormOpen(true)
  }

  function setField(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function submitForm() {
    const errors: Record<string, string> = {}
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        errors[field.key] = `«${field.label}» ${t('common.required')}`
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('')
      return
    }
    setFieldErrors({})
    const ok = editingId ? await onUpdate(editingId, values) : await onCreate(values)
    if (ok) setFormOpen(false)
    else setFormError(t('common.error'))
  }

  async function submitWizard(wizardValues: CrudValues): Promise<boolean> {
    const ok = editingId ? await onUpdate(editingId, wizardValues) : await onCreate(wizardValues)
    if (ok) setFormOpen(false)
    return ok
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const ok = await onDelete(getId(deleteTarget))
    if (ok) setDeleteTarget(null)
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">{icon}</div>
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-xs text-slate-400">{t('common.items', { n: items.length })}</p>
          </div>
        </div>
        {canManage && (
          <button onClick={openAdd} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
            <Plus className="mr-1 inline h-4 w-4" /> {t('common.add')}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-start">
          <thead className="bg-slate-950">
            <tr>
              {columns.map(col => (
                <th key={col.header} className={`table-cell text-xs font-black uppercase text-slate-400 ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
              {canManage && (
                <th className="table-cell text-center text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td className="table-cell text-slate-400" colSpan={columns.length + (canManage ? 1 : 0)}>
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={getId(item)} className="bg-slate-900/30 hover:bg-slate-800/40">
                  {columns.map(col => (
                    <td key={col.header} className={`table-cell ${col.className ?? ''}`}>
                      {col.render(item)}
                    </td>
                  ))}
                  {canManage && (
                    <td className="table-cell text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          title={t('common.edit')}
                          className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title={t('common.delete')}
                          className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage &&
        (renderWizard ? (
          renderWizard({
            open: formOpen,
            mode: editingId ? 'edit' : 'create',
            initialValues: values,
            busy,
            onClose: () => setFormOpen(false),
            onSubmit: submitWizard
          })
        ) : (
          <Modal
            open={formOpen}
            title={editingId ? t('settings.editTitle', { title }) : t('settings.addTitle', { title })}
            icon={icon}
            onClose={() => setFormOpen(false)}
            footer={
              <>
                <button
                  disabled={busy}
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  disabled={busy}
                  onClick={submitForm}
                  className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {busy ? t('common.saving') : editingId ? t('common.saveEdit') : t('common.add')}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              {fields.map(field => {
                const fieldError = fieldErrors[field.key]
                return (
                  <label key={field.key} className="block space-y-2">
                    <span className="text-sm font-bold text-slate-300">
                      {field.label}
                      {field.required && <span className="text-red-400"> *</span>}
                    </span>
                    {field.type === 'select' ? (
                      <select
                        className={`input-dark ${fieldError ? 'border-red-500/60' : ''}`}
                        value={values[field.key] ?? ''}
                        onChange={e => setField(field.key, e.target.value)}
                      >
                        <option value="">—</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          className="h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950"
                          value={values[field.key] || '#ffffff'}
                          onChange={e => setField(field.key, e.target.value)}
                        />
                        <span className="font-mono text-sm text-slate-300">{values[field.key]}</span>
                      </div>
                    ) : (
                      <input
                        className={`input-dark ${fieldError ? 'border-red-500/60' : ''}`}
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={e => setField(field.key, e.target.value)}
                      />
                    )}
                    {fieldError && <span className="block text-xs font-semibold text-red-400">{fieldError}</span>}
                  </label>
                )
              })}
              {formError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
              )}
            </div>
          </Modal>
        ))}

      {canManage && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title={t('settings.deleteTitle')}
          message={deleteTarget ? t('settings.deleteMsg', { name: getLabel(deleteTarget) }) : ''}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
