import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Pencil, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useAuth } from '../../Context/AuthContext'
import { createPartMaster, deletePart, listParts, updatePartMaster } from '../../services/partsService'
import { getVehicleModels } from '../../services/settingsService'
import { isAssignableModel } from '../../Utils/vehicleModelHierarchy'
import { inputCls } from '../FormField'
import { ExportableTable } from '../ExportableTable'
import { ConfirmDialog } from '../ConfirmDialog'
import { BomPartListFormModal, type PartListFormState } from './BomPartListFormModal'
import { parseApplicableModelNames } from '../../Utils/bomQtyByModel'
import type { PartListRow } from '../../Types/bom'

const PAGE_SIZE = 80

const emptyForm = (): PartListFormState => ({
  common_station: '',
  part_name_ar: '',
  part_name_en: '',
  common_name: '',
  model_names: []
})

type Props = {
  notify: (m: string, err?: boolean) => void
}

export function BomPartListTab({ notify }: Props) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canCreate = hasRole('admin') || hasPermission('bom', 'create') || hasPermission('bom', 'update')
  const canManage = hasRole('admin') || hasPermission('bom', 'update')
  const canDelete = hasRole('admin') || hasPermission('bom', 'delete') || canManage

  const [items, setItems] = useState<PartListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<PartListFormState>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [allModelNames, setAllModelNames] = useState<string[]>([])
  const [formModelsSeeded, setFormModelsSeeded] = useState(false)

  useEffect(() => {
    void getVehicleModels()
      .then(models =>
        setAllModelNames(
          models
            .filter(isAssignableModel)
            .map(m => m.name)
            .sort((a, b) => a.localeCompare(b))
        )
      )
      .catch(() => setAllModelNames([]))
  }, [])

  useEffect(() => {
    if (!formOpen) {
      setFormModelsSeeded(false)
      return
    }
    if (formModelsSeeded || allModelNames.length === 0 || form.model_names.length > 0) return
    setForm(prev => ({ ...prev, model_names: [...allModelNames] }))
    setFormModelsSeeded(true)
  }, [formOpen, formModelsSeeded, allModelNames, form.model_names.length])

  function displayModelNames(part: PartListRow): string[] {
    const stored = parseApplicableModelNames(part.applicable_models_text)
    return stored.length > 0 ? stored : allModelNames
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listParts({ search, page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setLoading(false)
    }
  }, [notify, page, search, t])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditId(null)
    setFormModelsSeeded(allModelNames.length > 0)
    setForm({
      ...emptyForm(),
      model_names: [...allModelNames]
    })
    setFormOpen(true)
  }

  function openEdit(part: PartListRow) {
    const stored = parseApplicableModelNames(part.applicable_models_text)
    setFormModelsSeeded(true)
    setEditId(part.id)
    setForm({
      common_station: part.common_station ?? '',
      part_name_ar: part.part_name_ar ?? '',
      part_name_en: part.part_name_en ?? '',
      common_name: part.common_name ?? part.part_name_ar ?? part.part_name_en ?? '',
      model_names: stored.length > 0 ? stored : [...allModelNames]
    })
    setFormOpen(true)
  }

  async function submitForm() {
    setBusy(true)
    try {
      const payload = {
        common_station: form.common_station,
        part_name_ar: form.part_name_ar,
        part_name_en: form.part_name_en,
        common_name: form.common_name,
        model_names: form.model_names
      }
      if (editId) {
        await updatePartMaster(editId, payload)
        notify(t('settings.updated'))
      } else {
        await createPartMaster(payload)
        notify(t('settings.added'))
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setBusy(true)
    try {
      await deletePart(deleteId)
      notify(t('settings.deleted'))
      setDeleteId(null)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const colCount = 5 + (canManage ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('bom.tabs.partList')}</h3>
              <p className="text-sm text-slate-400">{t('bom.partListHint')}</p>
            </div>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            >
              <Plus className="inline h-4 w-4" /> {t('common.add')}
            </button>
          )}
        </div>
      </div>

      <div className="card-industrial p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputCls()} w-full ps-9`}
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('bom.partListSearchPh')}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="inline h-4 w-4" /> {t('common.refresh')}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t('bom.partListSummary', { total, shown: items.length })}</p>
      </div>

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="parts-master" title={t('bom.tabs.partList')} rowCount={items.length}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                <th className="px-3 py-2 text-center">{t('bom.col.common_station')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.part_name_ar')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.part_name_en')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.common_name')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.used_in_models')}</th>
                {canManage && <th className="px-3 py-2 text-center">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-6 text-center text-slate-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-6 text-center text-slate-400">
                    {t('bom.partListEmpty')}
                  </td>
                </tr>
              ) : (
                items.map(part => {
                  const models = displayModelNames(part)
                  return (
                  <tr key={part.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    <td className="px-3 py-2 text-center">{part.common_station || '—'}</td>
                    <td className="px-3 py-2 text-center">{part.part_name_ar || '—'}</td>
                    <td className="px-3 py-2 text-center" dir="ltr">
                      {part.part_name_en || '—'}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-white">{part.common_name || '—'}</td>
                    <td className="max-w-[14rem] px-3 py-2 text-center text-xs text-slate-300" title={models.join(', ')}>
                      {models.length > 0 ? (
                        <span className="line-clamp-2">{models.join('، ')}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(part)}
                            className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(part.id)}
                              className="rounded-lg bg-red-500/15 p-2 text-red-300 hover:bg-red-500/25"
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </ExportableTable>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 disabled:opacity-40"
          >
            {t('common.back')}
          </button>
          <span className="text-xs text-slate-500">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      <BomPartListFormModal
        open={formOpen}
        editId={editId}
        form={form}
        busy={busy}
        defaultModelNames={allModelNames}
        onClose={() => setFormOpen(false)}
        onSave={() => void submitForm()}
        onChange={setForm}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t('settings.deleteTitle')}
        message={t('bom.partListDeleteConfirm')}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
        busy={busy}
      />
    </div>
  )
}
