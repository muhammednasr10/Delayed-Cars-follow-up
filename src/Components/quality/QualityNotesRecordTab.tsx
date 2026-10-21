import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ExportableTable } from '../ExportableTable'
import { ConfirmDialog } from '../ConfirmDialog'
import { QualityNoteFormModal } from './QualityNoteFormModal'
import { QualityNoteStatusSelect } from './QualityNoteStatusSelect'
import { QualityRepairTimeBadge, QualitySeverityBadge } from './qualityNoteBadges'
import { QUALITY_NOTE_CELL } from './qualityNoteConstants'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { formatStationReferenceCode } from '../../Utils/stationHierarchy'
import type { QualityNoteInput, QualityNoteRecord, QualityNoteStatus } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'

const COL_COUNT = 11

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
  onStatusChange: (id: string, status: QualityNoteStatus) => Promise<void>
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
  onStatusChange
}: Props) {
  const { t, lang } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<QualityNoteRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QualityNoteRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState('')

  const categoryLabel = useMemo(
    () => (code: string) => mpLookupLabel(categories, code, lang) || code,
    [categories, lang]
  )

  function formatDate(iso: string) {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  async function changeStatus(id: string, status: QualityNoteStatus) {
    setStatusBusyId(id)
    try {
      await onStatusChange(id, status)
    } finally {
      setStatusBusyId('')
    }
  }

  async function handleSave(input: QualityNoteInput) {
    setSaving(true)
    try {
      if (editing) await onUpdate(editing.id, input)
      else await onAdd(input)
      setFormOpen(false)
      setEditing(null)
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

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('qualityNotes.recordHint')}</p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
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
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.date')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.model')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.category')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>
                    {t('qualityNotes.cols.description')}
                  </th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.station')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>
                    {t('qualityNotes.cols.workerLine')}
                  </th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.severity')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>
                    {t('qualityNotes.cols.repairTime')}
                  </th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.vin')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('qualityNotes.cols.status')}</th>
                  <th className={`${QUALITY_NOTE_CELL} font-black text-slate-400`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-4 py-12 text-slate-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-4 py-12 text-slate-500">
                      {t('qualityNotes.empty')}
                    </td>
                  </tr>
                ) : (
                  items.map(row => (
                    <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                      <td className={`${QUALITY_NOTE_CELL} text-slate-300`}>{formatDate(row.notedAt)}</td>
                      <td
                        className={`${QUALITY_NOTE_CELL} max-w-[8rem] truncate text-slate-300`}
                        title={row.modelNames.join(', ')}
                      >
                        {row.modelNames.length ? row.modelNames.join(', ') : '—'}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} text-slate-300`}>{categoryLabel(row.category)}</td>
                      <td
                        className={`${QUALITY_NOTE_CELL} max-w-[14rem] truncate text-slate-200`}
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} font-mono text-slate-300`} dir="ltr">
                        {row.stationCode ? formatStationReferenceCode(row.stationCode) : '—'}
                      </td>
                      <td className={`${QUALITY_NOTE_CELL} font-mono text-slate-300`} dir="ltr">
                        {row.workerLineCode ?? '—'}
                      </td>
                      <td className={QUALITY_NOTE_CELL}>
                        <QualitySeverityBadge
                          severity={row.severity}
                          label={t(`qualityNotes.severity.${row.severity}`)}
                        />
                      </td>
                      <td className={QUALITY_NOTE_CELL}>
                        <QualityRepairTimeBadge
                          repairTime={row.repairTime}
                          label={t(`qualityNotes.repairTime.${row.repairTime}`)}
                        />
                      </td>
                      <td
                        className={`${QUALITY_NOTE_CELL} max-w-[10rem] truncate font-mono text-xs text-white`}
                        title={row.vins.join(', ')}
                      >
                        {row.vins.length ? row.vins.join(', ') : '—'}
                      </td>
                      <td className={QUALITY_NOTE_CELL}>
                        <QualityNoteStatusSelect
                          value={row.status}
                          disabled={statusBusyId === row.id}
                          ariaLabel={t('qualityNotes.cols.status')}
                          labelFor={status => t(`qualityNotes.status.${status}`)}
                          onChange={status => void changeStatus(row.id, status)}
                        />
                      </td>
                      <td className={QUALITY_NOTE_CELL}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title={t('common.edit')}
                            onClick={() => {
                              setEditing(row)
                              setFormOpen(true)
                            }}
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
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
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
