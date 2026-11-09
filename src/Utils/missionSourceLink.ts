import type { TeamMission } from '../Types/mission'

export type MissionSourceKind =
  | 'shortage'
  | 'scratch'
  | 'damaged_part'
  | 'internal_quality'
  | 'external_quality'

export function missionSourceKind(mission: TeamMission): MissionSourceKind | null {
  if (mission.sourceQualityNoteId) return 'external_quality'
  if (mission.sourceInternalQualityId) return 'internal_quality'
  if (mission.sourceDamagedPartId) return 'damaged_part'
  if (mission.sourceScratchId) return 'scratch'
  if (mission.sourceVehicleId || mission.sourceMissingPartId || mission.sourceVin?.trim()) return 'shortage'
  return null
}

export function missionSourceOpenLabelKey(kind: MissionSourceKind): string {
  return `missions.detail.openSource.${kind}`
}
