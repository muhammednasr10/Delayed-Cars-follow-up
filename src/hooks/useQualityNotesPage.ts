import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { useFormatError } from './useFormatError'
import { useEmployees } from './useEmployees'
import {
  createQualityNote,
  deleteQualityNote,
  getQualityNotes,
  updateQualityNote,
  updateQualityNoteStudy
} from '../services/qualityNotesService'
import { getQnCategoryOptions } from '../services/qualityNotesLookupService'
import { createTeamMission, listOpenQualityNoteMissions } from '../services/missionService'
import { getStations, getVehicleModels } from '../services/settingsService'
import type {
  QualityNoteInput,
  QualityNoteRecord,
  QualityNoteStatus,
  QualityNoteStudyPatch
} from '../Types/qualityNote'
import type { MpLookupOption } from '../Types/mpLookup'
import type { ShortageMissionLink, TeamMissionInput } from '../Types/mission'
import type { Station, VehicleModel } from '../Types/settings'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function useQualityNotesPage() {
  const { t } = useLang()
  const formatError = useFormatError()
  const { employees } = useEmployees()
  const [items, setItems] = useState<QualityNoteRecord[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [categories, setCategories] = useState<MpLookupOption[]>([])
  const [linkedMissions, setLinkedMissions] = useState<ShortageMissionLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)

  const modelNameById = useMemo(() => new Map(models.map(m => [m.id, m.name])), [models])

  const displayItems = useMemo(
    () =>
      items.map(row => ({
        ...row,
        modelNames: row.vehicleModelIds.map(id => modelNameById.get(id) ?? id)
      })),
    [items, modelNameById]
  )

  const refreshLinkedMissions = useCallback(async (notes: QualityNoteRecord[]) => {
    try {
      setLinkedMissions(await listOpenQualityNoteMissions(notes.map(n => n.id)))
    } catch {
      setLinkedMissions([])
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const notes = await getQualityNotes()
      setItems(notes)
      setSetupRequired(false)
      await refreshLinkedMissions(notes)
    } catch (e) {
      const msg = formatError(e)
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
      setLinkedMissions([])
    } finally {
      setLoading(false)
    }
  }, [formatError, refreshLinkedMissions])

  useEffect(() => {
    void load()
    getStations()
      .then(setStations)
      .catch(() => setStations([]))
    getVehicleModels()
      .then(setModels)
      .catch(() => setModels([]))
    getQnCategoryOptions()
      .then(setCategories)
      .catch(() => setCategories([]))
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

  async function handleStatusChange(id: string, status: QualityNoteStatus) {
    try {
      const updated = await updateQualityNoteStudy(id, { status }, modelNameById)
      setItems(prev => prev.map(row => (row.id === id ? updated : row)))
      if (status === 'under_study') notify(t('qualityNotes.sentToStudy'))
      else notify(t('qualityNotes.updated'))
    } catch (e) {
      setError(formatError(e))
      throw e
    }
  }

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

  async function handleAssignMission(note: QualityNoteRecord, input: TeamMissionInput) {
    setAssignBusy(true)
    setError('')
    try {
      await createTeamMission({
        ...input,
        sourceQualityNoteId: note.id,
        sourceModelName: note.modelNames.join(', ') || null,
        sourceVin: note.vins[0] ?? null
      })
      await refreshLinkedMissions(items)
      notify(t('qualityNotes.assignMission.saved'))
    } catch (e) {
      const raw = e instanceof Error ? e.message : ''
      const msg =
        raw === 'ASSIGNEE_NOT_SUBORDINATE' || raw.includes('ASSIGNEE_NOT_SUBORDINATE')
          ? t('missions.errAssigneeNotSubordinate')
          : formatError(e)
      setError(msg)
      throw new Error(msg)
    } finally {
      setAssignBusy(false)
    }
  }

  return {
    employees,
    displayItems,
    stations,
    models,
    categories,
    setCategories,
    linkedMissions,
    loading,
    error,
    setupRequired,
    success,
    assignBusy,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    handleStudy,
    handleAssignMission
  }
}
