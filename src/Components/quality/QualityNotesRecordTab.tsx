import { useMemo, useState } from 'react'
import { Microscope, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ExportableTable } from '../ExportableTable'
import { ConfirmDialog } from '../ConfirmDialog'
import { QualityNoteFormModal } from './QualityNoteFormModal'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import type { QualityNoteInput, QualityNoteRecord } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

type Props = {
  items: QualityNoteRecord[]
  loading: boolean
  stations: Station[]
  models: VehicleModel[]
  categories: MpLookupOption[]
  onCategoriesChange: (options: MpLookupOption[]) => void
  onAdd: (input: QualityNoteInput) => Promise<void>
  onUpdate: (id: string, input: QualityNoteInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSendToStudy: (note: QualityNoteRecord) => void
}

export function QualityNotesRecordTab({
  items,
  loading,
  stations,
  models,
  categories,
  onCategoriesChange,
  onAdd,
  onUpdate,
  onDelete,
  onSendToStudy
}: Props) {
  const { t, lang } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<QualityNoteRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QualityNoteRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryLabel = useMemo(
    () => (code: string) => mpLookupLabel(categories, code, lang) || code,
    [categories, lang]
  )

  function formatDate(iso: string) {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function severityBadge(severity: QualityNoteRecord['severity']) {
    const tones: Record<QualityNoteRecord['severity'], string> = {
      low: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      medium: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      high: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
      critical: 'bg-red-500/15 text-red-200 border-red-500/30'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[severity]}`}>
        {t(`qualityNotes.severity.${severity}`)}
      </span>
    )
  }

  function statusBadge(status: QualityNoteRecord['status']) {
    const tones: Record<QualityNoteRecord['status'], string> = {
      open: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
      under_study: 'bg-violet-500/15 text-violet-200 border-violet-500/30',
      closed: 'bg-slate-500/15 text-slate-200 border-slate-600/40'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[status]}`}>
        {t(`qualityNotes.status.${status}`)}
      </span>
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: QualityNoteRecord) {
    setEditing(row)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(input: QualityNoteInput) {
    setSaving(true)
    try {
      if (editing) await onUpdate(editing.id, input)
      else await onAdd(input)
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await onDelete(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const colCount = 11

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('qualityNotes.recordHint')}</p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          {t('qualityNotes.addNote')}
        </button>
      </div>

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="quality-notes" title={t('qualityNotes.title')} rowCount={items.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.date')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.model')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.category')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.description')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.station')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.workerLine')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.severity')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.vehicleCount')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.vin')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('qualityNotes.cols.status')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-slate-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-12 text-slate-500">
                      {t('qualityNotes.empty')}
                    </td>
                  </tr>
                ) : (
                  items.map(row => (
                    <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                      <td className={`${cell} text-slate-300`}>{formatDate(row.notedAt)}</td>
                      <td className={`${cell} max-w-[8rem] truncate text-slate-300`} title={row.modelNames.join(', ')}>
                        {row.modelNames.length ? row.modelNames.join(', ') : '—'}
                      </td>
                      <td className={`${cell} text-slate-300`}>{categoryLabel(row.category)}</td>
                      <td className={`${cell} max-w-[14rem] truncate text-slate-200`} title={row.description}>
                        {row.description}
                      </td>
                      <td className={`${cell} font-mono text-slate-300`} dir="ltr">
                        {row.stationCode ? formatStationReferenceCode(row.stationCode) : '—'}
                      </td>
                      <td className={`${cell} font-mono text-slate-300`} dir="ltr">
                        {row.workerLineCode ?? '—'}
                      </td>
                      <td className={cell}>{severityBadge(row.severity)}</td>
                      <td className={`${cell} font-black text-white`}>{row.vehicleCount}</td>
                      <td className={`${cell} max-w-[10rem] truncate font-mono text-xs text-white`} title={row.vins.join(', ')}>
                        {row.vins.length ? row.vins.join(', ') : '—'}
                      </td>
                      <td className={cell}>{statusBadge(row.status)}</td>
                      <td className={cell}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title={t('qualityNotes.studyAction')}
                            onClick={() => onSendToStudy(row)}
                            className="rounded-lg p-1.5 text-emerald-300 hover:bg-emerald-500/20"
                          >
                            <Microscope className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t('common.edit')}
                            onClick={() => openEdit(row)}
                            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(row)}
                            className="rounded-lg p-1.5 text-red-300 hover:bg-red-500/20"
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

      <QualityNoteFormModal
        open={formOpen}
        editing={editing}
        onClose={closeForm}
        onSave={handleSave}
        saving={saving}
        stations={stations}
        models={models}
        categories={categories}
        onCategoriesChange={onCategoriesChange}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('qualityNotes.deleteTitle')}
        message={t('qualityNotes.deleteMsg', { name: deleteTarget?.description?.slice(0, 60) ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
