import { supabase } from '../lib/supabase'
import type { TeamMission } from '../Types/mission'
import type { MissionReplyCorrection } from '../Utils/missionReply'
import { missionWriteError } from './missionRow'
import { teamMissionToInput, updateTeamMission } from './missionService'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

export async function applyMissionReplyCorrection(mission: TeamMission, correction: MissionReplyCorrection): Promise<void> {
  const { error } = await requireClient().rpc('correct_my_team_mission', {
    p_mission_id: mission.id,
    p_parent_model_id: correction.parentModelId,
    p_variant_model_id: correction.variantModelId,
    p_vehicle_count: correction.vehicleCount,
    p_chassis_numbers: correction.chassisNumbers
  })
  if (!error) return
  const missingFn = error.code === 'PGRST202' || /correct_my_team_mission/i.test(error.message ?? '')
  if (!missingFn) throw new Error(missionWriteError(error.message))
  await updateTeamMission(mission.id, {
    ...teamMissionToInput(mission),
    parentModelId: correction.parentModelId,
    variantModelId: correction.variantModelId,
    vehicleCount: correction.vehicleCount,
    chassisNumbers: correction.chassisNumbers
  })
}
