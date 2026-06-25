import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../ConfirmDialog'
import { EquipmentItemFormModal } from './EquipmentItemFormModal'
import {
  createLineEquipment,
  deleteLineEquipment,
  getLineEquipment,
  updateLineEquipment
} from '../../services/equipmentService'
import type { EquipmentType, LineEquipment, LineEquipmentInput } from '../../Types/equipment'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type Props = {
  equipmentType: EquipmentType
}

export function EquipmentRegistryTab({ equipmentType }: Props) {
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')

  const [items, setItems] = useState<LineEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LineEquipment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LineEquipment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getLineEquipment(equipmentType))
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [equipmentType, t])

  useEffect(() => {
    void load()
  }, [load])

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  function statusBadge(status: LineEquipment['status']) {
    const tones: Record<LineEquipment['status'], string> = {
      active: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
      calibration_due: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      out_of_service: 'bg-red-500/15 text-red-200 border-red-500/30',
      scrapped: 'bg-slate-500/15 text-slate-400 border-slate-600/40'
    }
    return (
      <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${tones[status]}`}>
        {t(`equipment.status.${status}`)}
      </span>
    )
  }

  async function save(input: LineEquipmentInput) {
    setSaving(true)
    try {
      if (editing) await updateLineEquipment(editing.id, input)
      else await createLineEquipment(input)
      setFormOpen(false)
      notify(t(editing ? 'settings.updated' : 'settings.added'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteLineEquipment(deleteTarget.id)
      setDeleteTarget(null)
      notify(t('settings.deleted'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t(`equipment.hints.${equipmentType}`)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" />
              {t('equipment.addItem')}
            </button>
          )}
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('equipment.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('equipment.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.id')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.name')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.model')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.location')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.status')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.nextCalibration')}</th>
              {canManage && <th className={`${cell} font-black text-slate-400`}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-slate-500">
                  {t('equipment.empty')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} font-mono font-black text-sky-200`}>{row.equipmentCode}</td>
                  <td className={`${cell} text-slate-200`}>{row.name || '—'}</td>
                  <td className={`${cell} text-slate-300`}>{row.model || '—'}</td>
                  <td className={`${cell} text-slate-300`}>{row.location || '—'}</td>
                  <td className={cell}>{statusBadge(row.status)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.nextCalibrationDue)}</td>
                  {canManage && (
                    <td className={cell}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(row)
                            setFormOpen(true)
                          }}
                          className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(row)} className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700">
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

      <EquipmentItemFormModal
        open={formOpen}
        equipmentType={equipmentType}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSave={save}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('equipment.deleteTitle')}
        message={t('equipment.deleteConfirm', { id: deleteTarget?.equipmentCode ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={saving}
      />
    </div>
  )
}
