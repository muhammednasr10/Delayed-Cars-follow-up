import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useCanManageProduction } from '../../hooks/useCanManageProduction'
import { ConfirmDialog } from '../ConfirmDialog'
import { ScratchFormModal } from './ScratchFormModal'
import { ScratchNotesModal } from './ScratchNotesModal'
import { ScratchRowActions } from './ScratchRowActions'
import { ExportableTable } from '../ExportableTable'
import type { ScratchInput, ScratchNoteTarget, ScratchRecord } from '../../Types/scratch'
import type { VehicleModel } from '../../Types/settings'
import type { MpFollowUpAssignment, ShortageMissionAssignInput } from '../../Types/mpVehicleActions'
import type { ShortageMissionLink } from '../../Types/mission'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'
const actionsCell = `${cell} sticky z-10 bg-slate-900/95 shadow-[inset_8px_0_12px_rgba(0,0,0,0.3)]`

type Props = {
  items: ScratchRecord[]
  models: VehicleModel[]
  modelsLoading?: boolean
  loading?: boolean
  saving?: boolean
  noteCounts?: Record<string, number>
  scratchMissions?: ShortageMissionLink[]
  assignMissionBusy?: boolean
  onAdd: (input: ScratchInput, imageFile: File | null) => Promise<void>
  onUpdate: (id: string, input: ScratchInput, imageFile: File | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onFollowUp: (id: string, assignment: MpFollowUpAssignment) => Promise<void>
  onComplete: (id: string) => Promise<void>
  onAssignMission: (row: ScratchRecord, input: ShortageMissionAssignInput) => Promise<void>
}

export function ScratchesRecordTab({
  items,
  models,
  modelsLoading,
  loading,
  saving,
  noteCounts = {},
  scratchMissions = [],
  assignMissionBusy,
  onAdd,
  onUpdate,
  onDelete,
  onFollowUp,
  onComplete,
  onAssignMission
}: Props) {
  const { t, lang } = useLang()
  const canManage = useCanManageProduction()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScratchRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScratchRecord | null>(null)
  const [completeTarget, setCompleteTarget] = useState<ScratchRecord | null>(null)
  const [notesTarget, setNotesTarget] = useState<ScratchNoteTarget | null>(null)
  const [success, setSuccess] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  function formatDate(iso: string) {
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function severityBadge(severity: ScratchRecord['severity']) {
    const tones: Record<ScratchRecord['severity'], string> = {
      light: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      medium: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      severe: 'bg-red-500/15 text-red-200 border-red-500/30'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[severity]}`}>
        {t(`scratches.severity.${severity}`)}
      </span>
    )
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: ScratchRecord) {
    setEditing(row)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  function flashSuccess(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  async function handleSave(input: ScratchInput, imageFile: File | null) {
    try {
      if (editing) {
        await onUpdate(editing.id, input, imageFile)
        flashSuccess(t('scratches.updated'))
      } else {
        await onAdd(input, imageFile)
        flashSuccess(t('scratches.saved'))
      }
      closeForm()
    } catch {
      /* error shown by parent */
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await onDelete(deleteTarget.id)
      setDeleteTarget(null)
      flashSuccess(t('common.deleted'))
    } catch {
      /* error shown by parent */
    }
  }

  async function confirmComplete() {
    if (!completeTarget) return
    try {
      await onComplete(completeTarget.id)
      setCompleteTarget(null)
      flashSuccess(t('scratches.completeSuccess', { vin: completeTarget.vin }))
    } catch {
      /* error shown by parent */
    }
  }

  const colCount = 10

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('scratches.recordHint')}</p>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white hover:bg-rose-400"
          >
            <Plus className="h-4 w-4" />
            {t('scratches.addScratch')}
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <div className="card-industrial overflow-hidden">
        <ExportableTable filename="scratches" title={t('scratches.title')} rowCount={items.length}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-center text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.parentModel')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.variant')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.vin')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.notes')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.orgUnit')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.severity')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.willStop')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.date')}</th>
                  <th className={`${cell} font-black text-slate-400`}>{t('scratches.cols.image')}</th>
                  <th
                    data-export-skip
                    className={`${actionsCell} font-black text-slate-400`}
                    style={{ insetInlineEnd: 0 }}
                  >
                    {t('common.actions')}
                  </th>
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
                      {t('scratches.empty')}
                    </td>
                  </tr>
                ) : (
                  items.map(row => (
                    <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                      <td className={`${cell} text-slate-200`}>{row.parentModelName || '—'}</td>
                      <td className={`${cell} font-bold text-white`}>{row.modelName || '—'}</td>
                      <td className={`${cell} font-mono font-bold text-white`}>
                        <span className="inline-flex items-center justify-center gap-2">
                          {row.vin}
                          {row.resolvedAt && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-200">
                              {t('scratches.resolved')}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={`${cell} max-w-[14rem] truncate text-slate-400`}>{row.notes || '—'}</td>
                      <td className={`${cell} text-slate-200`}>{row.bodyArea || '—'}</td>
                      <td className={cell}>{severityBadge(row.severity)}</td>
                      <td className={cell}>
                        <span
                          className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${
                            row.willStop
                              ? 'border-red-500/30 bg-red-500/15 text-red-200'
                              : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {row.willStop ? t('scratches.willStop.yes') : t('scratches.willStop.no')}
                        </span>
                      </td>
                      <td className={`${cell} text-slate-300`}>{formatDate(row.recordedAt)}</td>
                      <td className={cell}>
                        {row.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(row.imageUrl!)}
                            className="mx-auto block"
                          >
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded-lg border border-slate-700 object-cover"
                            />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-export-skip className={actionsCell} style={{ insetInlineEnd: 0 }}>
                        <ScratchRowActions
                          row={row}
                          canEdit={canManage}
                          canDelete={canManage}
                          canUpdate={canManage}
                          canNotes
                          canComplete={canManage}
                          canFollowUp={canManage}
                          disabled={saving}
                          noteCount={noteCounts[row.id] ?? 0}
                          assignMissionBusy={assignMissionBusy}
                          scratchMissions={scratchMissions}
                          onEdit={() => openEdit(row)}
                          onUpdate={() => openEdit(row)}
                          onDelete={() => setDeleteTarget(row)}
                          onOpenNotes={() =>
                            setNotesTarget({
                              scratchId: row.id,
                              vin: row.vin,
                              modelName: row.modelName
                            })
                          }
                          onComplete={() => setCompleteTarget(row)}
                          onFollowUp={assignment => void onFollowUp(row.id, assignment)}
                          onAssignMission={input => onAssignMission(row, input)}
                        />
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
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
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

      <ScratchFormModal
        open={formOpen}
        models={models}
        modelsLoading={modelsLoading}
        editing={editing}
        onClose={closeForm}
        onSave={(input, imageFile) => void handleSave(input, imageFile)}
        saving={saving}
      />

      <ScratchNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('scratches.deleteTitle')}
        message={t('scratches.deleteConfirm', { vin: deleteTarget?.vin ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={saving}
      />

      <ConfirmDialog
        open={!!completeTarget}
        title={t('scratches.complete')}
        message={t('scratches.completeConfirm', { vin: completeTarget?.vin ?? '' })}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        tone="default"
        onConfirm={() => void confirmComplete()}
        onCancel={() => setCompleteTarget(null)}
        busy={saving}
      />
    </div>
  )
}
