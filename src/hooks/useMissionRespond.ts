import { useState } from 'react'
import { useLang } from '../i18n/LanguageContext'
import { applyMissionReplyCorrection } from '../services/missionCorrection'
import { respondMyTeamMission } from '../services/missionResponseService'
import type { TeamMission } from '../Types/mission'
import { missionSaveErrorMessage } from '../Utils/missionForm'
import type { MissionReplyCorrection } from '../Utils/missionReply'
import { mapMissionActionError } from '../Utils/missionDisplay'

type ListApi = {
  setError: (value: string) => void
  setSaving: (value: boolean) => void
  notify: (msg: string) => void
  bumpDetailRefresh: () => void
  load: () => Promise<void>
}

export function useMissionRespond(list: ListApi, onChanged?: () => void) {
  const { t } = useLang()
  const [respondTarget, setRespondTarget] = useState<TeamMission | null>(null)

  async function respondMission(
    response: string,
    files: File[] = [],
    correction?: MissionReplyCorrection
  ) {
    if (!respondTarget) return
    list.setSaving(true)
    list.setError('')
    try {
      if (correction) await applyMissionReplyCorrection(respondTarget, correction)
      await respondMyTeamMission(respondTarget.id, response, files)
      list.notify(t('missions.respond.success'))
      setRespondTarget(null)
      list.bumpDetailRefresh()
      await list.load()
      onChanged?.()
    } catch (e) {
      list.setError(mapMissionActionError(missionSaveErrorMessage(e, t), t))
      throw e
    } finally {
      list.setSaving(false)
    }
  }

  return { respondTarget, setRespondTarget, respondMission }
}
