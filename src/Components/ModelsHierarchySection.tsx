import { useMemo, useState } from 'react'
import { Car, ChevronDown, ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Field, inputCls } from './FormField'
import {
  createVehicleModel,
  deleteVehicleModel,
  updateVehicleModel
} from '../services/settingsService'
import type { VehicleModel } from '../Types/settings'
import {
  buildModelFamilyGroups,
  inferParentNameFromVariant,
  type ModelFamilyGroup
} from '../Utils/vehicleModelHierarchy'

type Props = {
  models: VehicleModel[]
  busy: boolean
  onChanged: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

type FormMode = 'family' | 'variant' | null

export function ModelsHierarchySection({ models, busy, onChanged, onError, onSuccess }: Props) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editing, setEditing] = useState<VehicleModel | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VehicleModel | null>(null)

  const families = useMemo(() => models.filter(m => m.model_kind === 'family'), [models])
  const { groups, orphanVariants } = useMemo(() => buildModelFamilyGroups(models), [models])

  function toggleExpand(id: string) {
    setExpanded(p => ({ ...p, [id]: !p[id] }))
  }

  function openAddFamily() {
    setEditing(null)
    setFormMode('family')
    setName('')
    setParentId('')
  }

  function openAddVariant(parentModelId: string) {
    setEditing(null)
    setFormMode('variant')
    setName('')
    setParentId(parentModelId)
  }

  function openEdit(m: VehicleModel) {
    setEditing(m)
    setFormMode(m.model_kind)
    setName(m.name)
    setParentId(m.parent_model_id ?? '')
  }

  function closeForm() {
    setFormMode(null)
    setEditing(null)
  }

  async function saveForm() {
    const trimmed = name.trim().toUpperCase()
    if (!trimmed) {
      onError(t('settings.models.nameRequired'))
      return
    }
    if (formMode === 'variant' && !parentId) {
      onError(t('settings.models.parentRequired'))
      return
    }
    setSaving(true)
    onError('')
    try {
      if (editing) {
        await updateVehicleModel(editing.id, {
          name: trimmed,
          model_kind: formMode ?? editing.model_kind,
          parent_model_id: formMode === 'family' ? null : parentId || null
        })
      } else if (formMode === 'family') {
        await createVehicleModel({ name: trimmed, model_kind: 'family' })
      } else {
        await createVehicleModel({ name: trimmed, model_kind: 'variant', parent_model_id: parentId })
      }
      await onChanged()
      onSuccess(editing ? t('settings.updated') : t('settings.added'))
      closeForm()
    } catch (err) {
      onError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteVehicleModel(deleteTarget.id)
      await onChanged()
      onSuccess(t('settings.deleted'))
      setDeleteTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      onError(msg === 'MODEL_HAS_CHILDREN' ? t('settings.models.hasChildren') : msg || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  function onNameChange(v: string) {
    setName(v.toUpperCase())
    if (formMode === 'variant' && !editing && !parentId) {
      const inferred = inferParentNameFromVariant(v)
      if (inferred) {
        const parent = families.find(f => f.name.toUpperCase() === inferred)
        if (parent) setParentId(parent.id)
      }
    }
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-cyan-300" />
          <h3 className="font-black text-white">{t('settings.tabs.models')}</h3>
          <span className="text-xs text-slate-500">{t('common.items', { n: models.length })}</span>
        </div>
        <button
          type="button"
          onClick={openAddFamily}
          className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" /> {t('settings.models.addFamily')}
        </button>
      </div>

      <p className="border-b border-slate-800 px-4 py-2 text-xs text-slate-500">{t('settings.models.hint')}</p>

      <div className="divide-y divide-slate-800">
        {groups.map(g => (
          <FamilyBlock
            key={g.family.id}
            group={g}
            expanded={expanded[g.family.id] === true}
            onToggle={() => toggleExpand(g.family.id)}
            onAddVariant={() => openAddVariant(g.family.id)}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            t={t}
          />
        ))}
        {orphanVariants.length > 0 && (
          <div className="p-4">
            <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t('settings.models.orphans')}</p>
            <ul className="space-y-1">
              {orphanVariants.map(v => (
                <VariantRow key={v.id} model={v} onEdit={openEdit} onDelete={setDeleteTarget} t={t} />
              ))}
            </ul>
          </div>
        )}
        {models.length === 0 && !busy && (
          <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>
        )}
      </div>

      <Modal
        open={formMode !== null}
        title={
          editing
            ? t('settings.editTitle', { title: t('settings.tabs.models') })
            : formMode === 'family'
              ? t('settings.models.addFamily')
              : t('settings.models.addVariant')
        }
        onClose={closeForm}
        footer={
          <>
            <button type="button" onClick={closeForm} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveForm()}
              className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950 disabled:opacity-50"
            >
              {t('common.saveEdit')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('settings.fields.modelName')} required>
            <input
              className={inputCls()}
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder={formMode === 'family' ? 'T4' : 'T4C'}
            />
          </Field>
          {formMode === 'variant' && (
            <Field label={t('settings.models.parent')} required>
              <select className={inputCls()} value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">{t('settings.models.selectParent')}</option>
                {families.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {formMode === 'family' && (
            <p className="text-xs text-slate-500">{t('settings.models.familyHint')}</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('settings.deleteTitle')}
        message={t('settings.deleteMsg', { name: deleteTarget?.name ?? '' })}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function FamilyBlock({
  group,
  expanded,
  onToggle,
  onAddVariant,
  onEdit,
  onDelete,
  t
}: {
  group: ModelFamilyGroup
  expanded: boolean
  onToggle: () => void
  onAddVariant: () => void
  onEdit: (m: VehicleModel) => void
  onDelete: (m: VehicleModel) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const { family, variants } = group
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 px-4 py-3">
        <button type="button" onClick={onToggle} className="text-slate-400 hover:text-white">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300">
          {t('settings.models.family')}
        </span>
        <span className="flex-1 font-black text-white">{family.name}</span>
        <span className="text-xs text-slate-500">{t('settings.models.variantCount', { n: variants.length })}</span>
        <button
          type="button"
          onClick={onAddVariant}
          className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-300 hover:bg-slate-700"
        >
          <Plus className="mr-0.5 inline h-3 w-3" /> {t('settings.models.addVariant')}
        </button>
        <button type="button" onClick={() => onEdit(family)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(family)} className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/20">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {expanded && (
        <ul className="space-y-0 border-t border-slate-800/80 bg-slate-950/40 ps-10 pe-4 py-2">
          {variants.length === 0 ? (
            <li className="py-2 text-sm text-slate-500">{t('settings.models.noVariants')}</li>
          ) : (
            variants.map(v => <VariantRow key={v.id} model={v} onEdit={onEdit} onDelete={onDelete} t={t} />)
          )}
        </ul>
      )}
    </div>
  )
}

function VariantRow({
  model,
  onEdit,
  onDelete,
  t
}: {
  model: VehicleModel
  onEdit: (m: VehicleModel) => void
  onDelete: (m: VehicleModel) => void
  t: (key: string) => string
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-800/50">
      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{t('settings.models.variant')}</span>
      <span className="flex-1 font-bold text-slate-200">{model.name}</span>
      {model.parent_name && <span className="text-xs text-slate-500">← {model.parent_name}</span>}
      <button type="button" onClick={() => onEdit(model)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onDelete(model)} className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/20">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}
