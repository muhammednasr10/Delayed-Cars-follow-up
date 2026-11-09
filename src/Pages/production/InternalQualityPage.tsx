import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Microscope, Pencil, Plus, RefreshCcw, Repeat2, Trash2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { ConfirmDialog } from '../../Components/ConfirmDialog'
import { InternalQualityFormModal } from '../../Components/internalQuality/InternalQualityFormModal'
import { InternalQualityStudyModal } from '../../Components/internalQuality/InternalQualityStudyModal'
import { OpenLinkedMissionsButton } from '../../Components/missions/OpenLinkedMissionsButton'
import {
  createInternalQualityIssue,
  deleteInternalQualityIssue,
  getInternalQualityIssues,
  isMissingInternalQualityTable,
  updateInternalQualityIssue,
  updateInternalQualityStudy
} from '../../services/internalQualityService'
import { listOpenInternalQualityMissions } from '../../services/missionService'
import type { InternalQualityIssue, InternalQualityIssueInput, InternalQualityStudyPatch } from '../../Types/internalQuality'
import type { ShortageMissionLink } from '../../Types/mission'
import type { VehicleModel } from '../../Types/settings'
import { getVehicleModels } from '../../services/settingsService'
import { internalQualityStudyHasContent, nextStudyCounter } from '../../Utils/internalQualityStudy'

const cell = 'table-cell text-center align-middle px-3 py-2.5'

export function InternalQualityPage() {
  const { t, lang } = useLang()
  const { hasRole } = useAuth()
  const canManage = hasRole('admin', 'production')

  const [items, setItems] = useState<InternalQualityIssue[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InternalQualityIssue | null>(null)
  const [studyTarget, setStudyTarget] = useState<InternalQualityIssue | null>(null)
  const [studyRecurrence, setStudyRecurrence] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InternalQualityIssue | null>(null)
  const [saving, setSaving] = useState(false)
  const [linkedMissions, setLinkedMissions] = useState<ShortageMissionLink[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, modelRows] = await Promise.all([
        getInternalQualityIssues(),
        getVehicleModels().catch(() => [] as VehicleModel[])
      ])
      setItems(rows)
      setModels(modelRows)
      setSetupRequired(false)
      setLinkedMissions(await listOpenInternalQualityMissions(rows.map(r => r.id)).catch(() => []))
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isMissingInternalQualityTable(e))
      setError(msg)
      setItems([])
      setLinkedMissions([])
    } finally {
      setLoading(false)
    }
  }, [t])

  const linkedById = useMemo(() => {
    const map = new Map<string, ShortageMissionLink[]>()
    for (const m of linkedMissions) {
      const id = m.sourceInternalQualityId
      if (!id) continue
      const list = map.get(id) ?? []
      list.push(m)
      map.set(id, list)
    }
    return map
  }, [linkedMissions])

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

  async function save(input: InternalQualityIssueInput) {
    setSaving(true)
    try {
      if (editing) await updateInternalQualityIssue(editing.id, input)
      else await createInternalQualityIssue(input)
      setFormOpen(false)
      setEditing(null)
      notify(t(editing ? 'settings.updated' : 'settings.added'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function saveStudy(
    id: string,
    patch: Omit<InternalQualityStudyPatch, 'studyCount' | 'lastStudyAt'>
  ) {
    const row = items.find(item => item.id === id)
    const hasContent = internalQualityStudyHasContent(patch.study8d, patch.studyNotes, row?.problem ?? '')
    const next = nextStudyCounter({
      currentCount: row?.studyCount ?? 0,
      currentLastStudyAt: row?.lastStudyAt ?? null,
      hasContent,
      recurrence: studyRecurrence,
      nowIso: new Date().toISOString()
    })
    setSaving(true)
    try {
      await updateInternalQualityStudy(id, {
        ...patch,
        studyCount: next.studyCount,
        lastStudyAt: next.lastStudyAt
      })
      setStudyTarget(null)
      setStudyRecurrence(false)
      notify(t(studyRecurrence ? 'internalQuality.recurrenceSaved' : 'internalQuality.studySaved'))
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
      await deleteInternalQualityIssue(deleteTarget.id)
      setDeleteTarget(null)
      notify(t('settings.deleted'))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const colCount = 7

  function modelNames(row: InternalQualityIssue) {
    if (row.vehicleModelIds.length === 0) return '—'
    return row.vehicleModelIds
      .map(id => models.find(model => model.id === id)?.name ?? id)
      .join(lang === 'ar' ? '، ' : ', ')
  }

  return (
    <div className="space-y-4">
      <section className="card-industrial p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-500/15 p-3 text-teal-300">
            <BadgeCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('internalQuality.title')}</h2>
            <p className="text-sm text-slate-400">{t('internalQuality.subtitle')}</p>
          </div>
        </div>
      </section>

      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('internalQuality.hint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-teal-400"
            >
              <Plus className="h-4 w-4" />
              {t('internalQuality.add')}
            </button>
          )}
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('internalQuality.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('internalQuality.setupHint')}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </div>
      )}
      {error && !setupRequired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.problemType')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.problem')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.workshop')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.models')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.firstReported')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('internalQuality.cols.lastUpdated')}</th>
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
                  {t('internalQuality.empty')}
                </td>
              </tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={`${cell} font-bold text-slate-100`}>{row.problemType}</td>
                  <td className={`${cell} max-w-xs whitespace-normal text-slate-200`}>{row.problem}</td>
                  <td className={`${cell} text-slate-200`}>{row.reportingWorkshop}</td>
                  <td className={`${cell} max-w-xs whitespace-normal text-slate-200`}>{modelNames(row)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.firstReportedAt)}</td>
                  <td className={`${cell} text-slate-300`}>{formatDate(row.lastStudyAt)}</td>
                  <td className={cell}>
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <OpenLinkedMissionsButton linked={linkedById.get(row.id) ?? []} searchHint={row.problem} />
                      <button
                        type="button"
                        title={t('internalQuality.studyCount', { n: row.studyCount })}
                        onClick={() => {
                          setStudyRecurrence(false)
                          setStudyTarget(row)
                        }}
                        className="relative rounded-lg bg-slate-800 p-2 text-teal-300 hover:bg-slate-700"
                      >
                        <Microscope className="h-4 w-4" />
                        <span className="absolute -top-1.5 -start-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[10px] font-black leading-none text-slate-950">
                          {row.studyCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        title={t('internalQuality.recurrence')}
                        onClick={() => {
                          setStudyRecurrence(true)
                          setStudyTarget(row)
                        }}
                        className="rounded-lg bg-slate-800 p-2 text-amber-300 hover:bg-slate-700"
                      >
                        <Repeat2 className="h-4 w-4" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            title={t('common.edit')}
                            onClick={() => {
                              setEditing(row)
                              setFormOpen(true)
                            }}
                            className="rounded-lg bg-slate-800 p-2 text-cyan-300 hover:bg-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(row)}
                            className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InternalQualityFormModal
        open={formOpen}
        editing={editing}
        models={models}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSave={input => void save(input)}
        saving={saving}
      />

      <InternalQualityStudyModal
        open={!!studyTarget}
        issue={studyTarget}
        modelLabel={studyTarget && studyTarget.vehicleModelIds.length > 0 ? modelNames(studyTarget) : ''}
        recurrence={studyRecurrence}
        onClose={() => {
          setStudyTarget(null)
          setStudyRecurrence(false)
        }}
        onSave={(id, patch) => void saveStudy(id, patch)}
        saving={saving}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('internalQuality.deleteTitle')}
        message={t('internalQuality.deleteConfirm', { name: deleteTarget?.problemType ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
        busy={saving}
      />
    </div>
  )
}
