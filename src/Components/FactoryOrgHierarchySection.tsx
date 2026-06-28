import { useMemo, useState } from 'react'
import { Building2, ChevronDown, ChevronLeft, Network, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Field, inputCls } from './FormField'
import {
  createFactoryOrgUnit,
  deleteFactoryOrgUnit,
  updateFactoryOrgUnit
} from '../services/factoryOrgService'
import type { FactoryOrgUnit, FactoryOrgUnitKind, FactoryOrgUnitNode } from '../Types/factoryOrg'
import { buildFactoryOrgTree, factoryOrgUnitKindLabel } from '../Utils/factoryOrgHierarchy'

type Props = {
  units: FactoryOrgUnit[]
  busy: boolean
  onChanged: () => Promise<void>
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

type FormMode = {
  kind: FactoryOrgUnitKind
  parent: FactoryOrgUnit | null
  editing: FactoryOrgUnit | null
} | null

export function FactoryOrgHierarchySection({ units, busy, onChanged, onError, onSuccess }: Props) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FactoryOrgUnit | null>(null)

  const tree = useMemo(() => buildFactoryOrgTree(units), [units])

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function isExpanded(id: string) {
    return expanded[id] === true
  }

  function openAddAdministration() {
    setFormMode({ kind: 'administration', parent: null, editing: null })
    setName('')
    setSortOrder('0')
  }

  function openAddChild(parent: FactoryOrgUnit, kind: FactoryOrgUnitKind) {
    setFormMode({ kind, parent, editing: null })
    setName('')
    setSortOrder('0')
  }

  function openEdit(unit: FactoryOrgUnit) {
    setFormMode({ kind: unit.unitKind, parent: null, editing: unit })
    setName(unit.name)
    setSortOrder(String(unit.sortOrder))
  }

  function closeForm() {
    setFormMode(null)
  }

  function formTitle(): string {
    if (!formMode) return ''
    if (formMode.editing) return t('settings.editTitle', { title: t('settings.tabs.administrations') })
    if (formMode.kind === 'administration') return t('settings.administrations.addAdministration')
    if (formMode.kind === 'section') return t('settings.administrations.addSection')
    return t('settings.administrations.addSubsection')
  }

  async function saveForm() {
    const trimmed = name.trim()
    if (!trimmed) {
      onError(t('settings.administrations.nameRequired'))
      return
    }
    if (!formMode) return

    setSaving(true)
    onError('')
    try {
      if (formMode.editing) {
        await updateFactoryOrgUnit(formMode.editing.id, {
          name: trimmed,
          sortOrder: Number(sortOrder) || 0
        })
      } else {
        await createFactoryOrgUnit({
          name: trimmed,
          unitKind: formMode.kind,
          parentId: formMode.parent?.id ?? null,
          sortOrder: Number(sortOrder) || 0
        })
      }
      await onChanged()
      onSuccess(formMode.editing ? t('settings.updated') : t('settings.added'))
      closeForm()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'INVALID_ORG_PARENT') onError(t('settings.administrations.invalidParent'))
      else onError(msg || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteFactoryOrgUnit(deleteTarget.id)
      await onChanged()
      onSuccess(t('settings.deleted'))
      setDeleteTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      onError(msg === 'ORG_UNIT_HAS_CHILDREN' ? t('settings.administrations.hasChildren') : msg || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-cyan-300" />
          <h3 className="font-black text-white">{t('settings.tabs.administrations')}</h3>
          <span className="text-xs text-slate-500">{t('common.items', { n: units.length })}</span>
        </div>
        <button
          type="button"
          onClick={openAddAdministration}
          className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" /> {t('settings.administrations.addAdministration')}
        </button>
      </div>

      <p className="border-b border-slate-800 px-4 py-2 text-xs text-slate-500">{t('settings.administrations.hint')}</p>

      <div className="divide-y divide-slate-800">
        {tree.map(node => (
          <OrgUnitNodeBlock
            key={node.unit.id}
            node={node}
            depth={0}
            expanded={isExpanded(node.unit.id)}
            onToggle={() => toggleExpand(node.unit.id)}
            isExpanded={isExpanded}
            onToggleChild={toggleExpand}
            onAddChild={openAddChild}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            t={t}
          />
        ))}
        {units.length === 0 && !busy && (
          <p className="p-8 text-center text-slate-500">{t('settings.administrations.empty')}</p>
        )}
      </div>

      <Modal
        open={formMode !== null}
        title={formTitle()}
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
          {formMode?.parent && !formMode.editing && (
            <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
              {t('settings.administrations.under')}: <span className="font-bold text-white">{formMode.parent.name}</span>
              {' · '}
              <span className="text-slate-400">{factoryOrgUnitKindLabel(formMode.parent.unitKind, t)}</span>
            </p>
          )}
          {formMode?.editing && (
            <p className="text-xs text-slate-500">{factoryOrgUnitKindLabel(formMode.editing.unitKind, t)}</p>
          )}
          <Field label={t('settings.administrations.name')} required>
            <input className={inputCls()} value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label={t('settings.fields.sortOrder')}>
            <input
              type="number"
              className={inputCls()}
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            />
          </Field>
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

function OrgUnitNodeBlock({
  node,
  depth,
  expanded,
  onToggle,
  isExpanded,
  onToggleChild,
  onAddChild,
  onEdit,
  onDelete,
  t
}: {
  node: FactoryOrgUnitNode
  depth: number
  expanded: boolean
  onToggle: () => void
  isExpanded: (id: string) => boolean
  onToggleChild: (id: string) => void
  onAddChild: (parent: FactoryOrgUnit, kind: FactoryOrgUnitKind) => void
  onEdit: (unit: FactoryOrgUnit) => void
  onDelete: (unit: FactoryOrgUnit) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const { unit, children } = node
  const childKind: FactoryOrgUnitKind | null =
    unit.unitKind === 'administration' ? 'section' : unit.unitKind === 'section' || unit.unitKind === 'subsection' ? 'subsection' : null
  const addLabel =
    childKind === 'section'
      ? t('settings.administrations.addSection')
      : childKind === 'subsection'
        ? t('settings.administrations.addSubsection')
        : null

  const tone =
    unit.unitKind === 'administration'
      ? 'bg-violet-500/20 text-violet-200'
      : unit.unitKind === 'section'
        ? 'bg-cyan-500/15 text-cyan-200'
        : 'bg-slate-700/80 text-slate-300'

  const Icon = unit.unitKind === 'administration' ? Building2 : Network

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-slate-900/40"
        style={{ paddingInlineStart: `${16 + depth * 20}px` }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="text-slate-400 hover:text-white"
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />
          ) : (
            <span className="inline-block w-5" />
          )}
        </button>
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${tone}`}>
          {factoryOrgUnitKindLabel(unit.unitKind, t)}
        </span>
        <span className="flex-1 font-bold text-slate-100">{unit.name}</span>
        {addLabel && childKind && (
          <button
            type="button"
            onClick={() => onAddChild(unit, childKind)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-300 hover:bg-slate-700"
          >
            <Plus className="mr-0.5 inline h-3 w-3" /> {addLabel}
          </button>
        )}
        <button type="button" onClick={() => onEdit(unit)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(unit)} className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/20">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {expanded &&
        children.map(child => (
          <OrgUnitNodeBlock
            key={child.unit.id}
            node={child}
            depth={depth + 1}
            expanded={isExpanded(child.unit.id)}
            onToggle={() => onToggleChild(child.unit.id)}
            isExpanded={isExpanded}
            onToggleChild={onToggleChild}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            t={t}
          />
        ))}
    </div>
  )
}
