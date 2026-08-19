import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { getTeamMissions } from '../services/missionService'
import type { TeamMission } from '../Types/mission'
import { isMissionSchemaMissing } from '../Utils/missionDisplay'

export function useTeamMissions() {
  const { t } = useLang()
  const [items, setItems] = useState<TeamMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailTarget, setDetailTarget] = useState<TeamMission | null>(null)
  const [detailRefresh, setDetailRefresh] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await getTeamMissions()
      setItems(next)
      setDetailTarget(prev => (prev ? next.find(m => m.id === prev.id) ?? prev : null))
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isMissionSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  function notify(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  function bumpDetailRefresh() {
    setDetailRefresh(k => k + 1)
  }

  return {
    items,
    loading,
    error,
    setError,
    setupRequired,
    success,
    saving,
    setSaving,
    detailTarget,
    setDetailTarget,
    detailRefresh,
    load,
    notify,
    bumpDetailRefresh
  }
}
