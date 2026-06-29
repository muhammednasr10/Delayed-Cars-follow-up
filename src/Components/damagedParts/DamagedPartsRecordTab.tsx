import { useState } from 'react'
import { Ban, Pencil, Plus, RefreshCcw, Trash2, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { DamagedPartFormModal } from './DamagedPartFormModal'
import { ExportableTable } from '../ExportableTable'
import { useFormatError } from '../../hooks/useFormatError'
import { useDamagedPartsLookups } from '../../hooks/useDamagedPartsLookups'
import {
  createDamagedPart,
  deleteDamagedPart,
  updateDamagedPart,
  updateDamagedPartRepairable,
  uploadDamagedPartImage
} from '../../services/damagedPartsService'
import { dpLookupLabel } from '../../Utils/dpLookupLabel'
import type { DamagedPartInput, DamagedPartRecord } from '../../Types/damagedPart'
import type { Employee } from '../../Types/employee'
import type { VehicleModel } from '../../Types/settings'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

const DECISION_TONES: Record<string, string> = {
  pending: 'bg-slate-600/30 text-slate-200 border-slate-500/40',
  scrap: 'bg-red-500/15 text-red-200 border-red-500/30',
  rework: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  return_supplier: 'bg-violet-500/15 text-violet-200 border-violet-500/30',
  use_as_is: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
}

type Props = {
  items: DamagedPartRecord[]
  loading: boolean
  models: VehicleModel[]
  employees: Employee[]
  onReload: () => Promise<void>
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export function DamagedPartsRecordTab({ items, loading, models, employees, onReload, onSuccess, onError }: Props) {
  const { t, lang } = useLang()
  const formatError = useFormatError()
  const { reasons, decisions } = useDamagedPartsLookups()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DamagedPartRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DamagedPartRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  function formatDate(iso: string) {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function decisionBadge(decision: string) {
    const tone = DECISION_TONES[decision] ?? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30'
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tone}`}>
        {dpLookupLabel(decisions, decision, lang)}
      </span>
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: DamagedPartRecord) {
    setEditing(row)
    setFormOpen(true)
  }

  async function handleSave(input: DamagedPartInput, imageFile: File | null, editingId?: string) {
    setSaving(true)
    try {
      const saved = editingId ? await updateDamagedPart(editingId, input) : await createDamagedPart(input)
      if (imageFile) {
        await uploadDamagedPartImage(saved.id, imageFile)
      }
      setFormOpen(false)
      setEditing(null)
      onSuccess?.(editingId ? t('damagedParts.updated') : t('damagedParts.saved'))
      await onReload()
    } catch (e) {
      onError?.(formatError(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleRepairable(row: DamagedPartRecord) {
    setSaving(true)
    try {
      await updateDamagedPartRepairable(row.id, !row.isRepairable)
      onSuccess?.(t('damagedParts.repairableUpdated'))
      await onReload()
    } catch (e) {
      onError?.(formatError(e))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteDamagedPart(deleteTarget.id)
      setDeleteTarget(null)
      onSuccess?.(t('common.deleted'))
      await onReload()
    } catch (e) {
      onError?.(formatError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('damagedParts.recordHint')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onReload()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="h-4 w-4" />
            {t('common.refresh')}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" />
            {t('damagedParts.addPart')}
          </button>
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="damaged-parts" title={t('damagedParts.title')} rowCount={items.length}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.date')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.model')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.part')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.quantity')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.causer')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.reason')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.finalDecision')}</th>
              <th data-export-skip className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.image')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('common.notes')}</th>
              <th data-export-skip className={`${cell} font-black text-slate-400`}>{t('damagedParts.cols.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-slate-500">
                  {t('damagedParts.empty')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} text-slate-300`}>{formatDate(row.reportedAt)}</td>
                  <td className={`${cell} font-bold text-white`}>{row.modelName}</td>
                  <td className={cell}>
                    <p className="font-mono font-bold text-cyan-200" dir="ltr">
                      {row.partNumber}
                    </p>
                    {row.partName && <p className="mt-0.5 text-xs text-slate-400">{row.partName}</p>}
                  </td>
                  <td className={`${cell} font-mono text-white`} dir="ltr">
                    {row.quantity}
                  </td>
                  <td className={`${cell} font-bold text-slate-100`}>
                    {row.causedByName ?? t('damagedParts.unknownCauser')}
                  </td>
                  <td className={`${cell} text-slate-200`}>{dpLookupLabel(reasons, row.damageReason, lang)}</td>
                  <td className={cell}>{decisionBadge(row.finalDecision)}</td>
                  <td data-export-skip className={cell}>
                    {row.imageUrl ? (
                      <button type="button" onClick={() => setPreviewImage(row.imageUrl)} className="mx-auto block">
                        <img src={row.imageUrl} alt="" className="h-10 w-10 rounded-lg border border-slate-700 object-cover" />
                      </button>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className={`${cell} max-w-[12rem] truncate text-slate-400`}>{row.notes || '—'}</td>
                  <td data-export-skip className={cell}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        title={row.isRepairable ? t('damagedParts.repairableYes') : t('damagedParts.repairableNo')}
                        onClick={() => void toggleRepairable(row)}
                        className={`rounded-lg p-2 ${
                          row.isRepairable
                            ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                        }`}
                      >
                        {row.isRepairable ? <Wrench className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        title={t('common.edit')}
                        onClick={() => openEdit(row)}
                        className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        title={t('common.delete')}
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        </ExportableTable>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
          role="presentation"
        >
          <img
            src={previewImage}
            alt=""
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <DamagedPartFormModal
        open={formOpen}
        models={models}
        employees={employees}
        editing={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('damagedParts.deleteTitle')}
        message={t('damagedParts.deleteConfirm', { part: deleteTarget?.partNumber ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={saving}
      />
    </div>
  )
}

