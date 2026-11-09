export const MISSION_AUTO_ROUTE_EVENTS = [
  'missing_part_vehicle',
  'scratch',
  'damaged_part',
  'internal_quality',
  'external_quality'
] as const

export type MissionAutoRouteEvent = (typeof MISSION_AUTO_ROUTE_EVENTS)[number]

export type MissionAutoRoute = {
  eventType: MissionAutoRouteEvent
  assigneeEmployeeId: string | null
  assigneeName: string | null
  assigneeCode: string | null
  enabled: boolean
  updatedAt: string
}

export type MissionAutoRouteInput = {
  eventType: MissionAutoRouteEvent
  assigneeEmployeeId: string | null
  enabled: boolean
}

export type CreateAutoRoutedMissionInput = {
  eventType: MissionAutoRouteEvent
  title: string
  description?: string | null
  sourceVehicleId?: string | null
  sourceMissingPartId?: string | null
  sourceScratchId?: string | null
  sourceDamagedPartId?: string | null
  sourceInternalQualityId?: string | null
  sourceQualityNoteId?: string | null
  sourceVin?: string | null
  sourceModelName?: string | null
}
