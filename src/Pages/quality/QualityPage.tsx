import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { SetupRequired } from '../../Components/SetupRequired'
import { QualityNotesRecordTab } from '../../Components/quality/QualityNotesRecordTab'
import { QualityNotesStudyTab } from '../../Components/quality/QualityNotesStudyTab'
import { useFormatError } from '../../hooks/useFormatError'
import {
  createQualityNote,
  deleteQualityNote,
  getQualityNotes,
  updateQualityNote,
  updateQualityNoteStudy
} from '../../services/qualityNotesService'
import { getQnCategoryOptions } from '../../services/qualityNotesLookupService'
import type { QualityNoteInput, QualityNoteRecord, QualityNoteStudyPatch } from '../../Types/qualityNote'
import type { MpLookupOption } from '../../Types/mpLookup'
import { getStations, getVehicleModels } from '../../services/settingsService'
import type { Station, VehicleModel } from '../../Types/settings'
import { useNavigation } from '../../Context/NavigationContext'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function QualityPage() {
  const { t } = useLang()
  const { qualityTab: tab, setQualityTab: setTab } = useNavigation()
  const formatError = useFormatError()
  const [items, setItems] = useState<QualityNoteRecord[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [categories, setCategories] = useState<MpLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [pendingStudyNoteId, setPendingStudyNoteId] = useState<string | null>(null)

  const modelNameById = useMemo(() => new Map(models.map(m => [m.id, m.name])), [models])

  const displayItems = useMemo(
    () =>
      items.map(row => ({
        ...row,
        modelNames: row.vehicleModelIds.map(id => modelNameById.get(id) ?? id)
      })),
    [items, modelNameById]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getQualityNotes())
      setSetupRequired(false)
    } catch (e) {
      const msg = formatError(e)
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    getStations().then(setStations).catch(() => setStations([]))
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getQnCategoryOptions().then(setCategories).catch(() => setCategories([]))
  }, [load])

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  async function handleAdd(input: QualityNoteInput) {
    try {
      const created = await createQualityNote(input, modelNameById)
      setItems(prev => [created, ...prev])
      notify(t('qualityNotes.saved'))
    } catch (e) {
      setError(formatError(e))
      throw e
    }
  }

  async function handleUpdate(id: string, input: QualityNoteInput) {
    try {
      const updated = await updateQualityNote(id, input, modelNameById)
      setItems(prev => prev.map(row => (row.id === id ? updated : row)))
      notify(t('qualityNotes.updated'))
    } catch (e) {
      setError(formatError(e))
      throw e
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteQualityNote(id)
      setItems(prev => prev.filter(row => row.id !== id))
      notify(t('qualityNotes.deleted'))
    } catch (e) {
      setError(formatError(e))
      throw e
    }
  }

  function handleSendToStudy(note: QualityNoteRecord) {
    setPendingStudyNoteId(note.id)
    setTab('study')
  }

  const clearPendingStudy = useCallback(() => setPendingStudyNoteId(null), [])

  async function handleStudy(id: string, patch: QualityNoteStudyPatch) {
    try {
      const updated = await updateQualityNoteStudy(id, patch, modelNameById)
      setItems(prev => prev.map(row => (row.id === id ? updated : row)))
      notify(t('qualityNotes.studySaved'))
    } catch (e) {
      setError(formatError(e))
      throw e
    }
  }

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <section className="space-y-4">
      {error && !setupRequired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>
      )}

      {tab === 'record' && (
        <QualityNotesRecordTab
          items={displayItems}
          loading={loading}
          stations={stations}
          models={models}
          categories={categories}
          onCategoriesChange={setCategories}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onSendToStudy={handleSendToStudy}
        />
      )}
      {tab === 'study' && (
        <QualityNotesStudyTab
          items={displayItems}
          loading={loading}
          categories={categories}
          onStudy={handleStudy}
          initialStudyNoteId={pendingStudyNoteId}
          onInitialStudyHandled={clearPendingStudy}
        />
      )}
    </section>
  )
}
