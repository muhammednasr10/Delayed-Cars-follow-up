import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useStationOperations } from '../../hooks/useStationOperations'
import { getQualityNotes, createQualityNote } from '../../services/qualityNotesService'
import { getQnCategoryOptions } from '../../services/qualityNotesLookupService'
import { fetchMyEmployeeProfile, fetchMyStationWork } from '../../services/workerProfileService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import { QualityNoteFormModal } from '../quality/QualityNoteFormModal'
import type { QualityNoteInput, QualityNoteRecord } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'

export function WorkerProfileErrorsTab() {
  const { t } = useLang()
  const { parentGroups } = useStationOperations()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [categories, setCategories] = useState<MpLookupOption[]>([])
  const [notes, setNotes] = useState<QualityNoteRecord[]>([])
  const [stationId, setStationId] = useState<string | null>(null)
  const [workerLineStationId, setWorkerLineStationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const modelRows = await getVehicleModels()
      const [stationRows, categoryRows, profile, stationWork] = await Promise.all([
        getStations(),
        getQnCategoryOptions(),
        fetchMyEmployeeProfile(),
        fetchMyStationWork(parentGroups, modelRows)
      ])
      setModels(modelRows)
      setStations(stationRows)
      setCategories(categoryRows)
      const resolvedStationId = stationWork?.workerStationId ?? profile?.stationId ?? null
      setStationId(resolvedStationId)
      setWorkerLineStationId(stationWork?.workerStationId ?? null)
      const modelNameById = new Map(modelRows.map(m => [m.id, m.name]))
      const all = await getQualityNotes(modelNameById)
      const filtered = all.filter(
        n =>
          (resolvedStationId && n.stationId === resolvedStationId) ||
          (stationWork?.workerStationId && n.workerLineStationId === stationWork.workerStationId)
      )
      setNotes(filtered.slice(0, 50))
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [parentGroups, t])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave(input: QualityNoteInput) {
    setSaving(true)
    try {
      const withDefaults: QualityNoteInput = {
        ...input,
        stationId: input.stationId || stationId || '',
        workerLineStationId: input.workerLineStationId || workerLineStationId || ''
      }
      await createQualityNote(withDefaults, new Map(models.map(m => [m.id, m.name])))
      setFormOpen(false)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-industrial space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.tabs.errors')}</h3>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-500/30"
          >
            <Plus className="h-4 w-4" />
            {t('workerProfile.reportError')}
          </button>
        </div>
        <p className="text-xs text-slate-500">{t('workerProfile.errorsHint')}</p>

        {loading && <p className="text-sm text-slate-400">{t('common.loading')}</p>}
        {err && <p className="text-sm text-red-300">{err}</p>}

        {!loading && !err && notes.length === 0 && (
          <p className="text-sm text-slate-500">{t('workerProfile.noErrors')}</p>
        )}

        {!loading && notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map(n => (
              <li key={n.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span dir="ltr">{n.notedAt}</span>
                  <span>·</span>
                  <span>{n.category}</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5">{t(`qualityNotes.status.${n.status}`)}</span>
                </div>
                <p className="mt-1 text-slate-200">{n.description}</p>
                {n.stationCode && (
                  <p className="mt-1 text-xs text-slate-500">
                    {n.stationCode}
                    {n.workerLineCode ? ` · ${n.workerLineCode}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <QualityNoteFormModal
        open={formOpen}
        stations={stations}
        models={models}
        categories={categories}
        onCategoriesChange={setCategories}
        saving={saving}
        onClose={() => setFormOpen(false)}
        onSave={input => void handleSave(input)}
      />
    </div>
  )
}
