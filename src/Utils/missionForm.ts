import { isValidVinLength } from './vinValidation'
import type { TeamMission, TeamMissionInput } from '../Types/mission'

export const MAX_MISSION_VEHICLES = 40

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function todayIsoDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function resizeChassis(current: string[] | undefined, count: number): string[] {
  const next = (current ?? []).slice(0, count)
  while (next.length < count) next.push('')
  return next
}

export function emptyMissionForm(): TeamMissionInput {
  return {
    title: '',
    description: '',
    assigneeIds: [],
    status: 'pending',
    priority: 'normal',
    dueDate: todayIsoDate(),
    recurrenceType: 'none',
    recurrenceCustom: '',
    notes: '',
    parentModelId: null,
    variantModelId: null,
    vehicleCount: null,
    chassisNumbers: [],
    iplParts: []
  }
}

export function missionFormState(editing: TeamMission | null, defaultTitle?: string): TeamMissionInput {
  if (!editing) return { ...emptyMissionForm(), title: defaultTitle?.trim() ?? '' }
  return {
    title: editing.title,
    description: editing.description ?? '',
    assigneeIds: editing.assigneeIds,
    status: editing.status,
    priority: editing.priority,
    dueDate: editing.dueDate ?? todayIsoDate(),
    recurrenceType: editing.recurrenceType ?? 'none',
    recurrenceCustom: editing.recurrenceCustom ?? '',
    notes: editing.notes ?? '',
    parentModelId: editing.parentModelId,
    variantModelId: editing.variantModelId,
    vehicleCount: editing.vehicleCount,
    chassisNumbers: resizeChassis(editing.chassisNumbers, editing.vehicleCount ?? editing.chassisNumbers.length),
    iplParts: editing.iplParts ?? []
  }
}

export function validateChassisNumbers(
  vehicleCount: number | null | undefined,
  chassisNumbers: string[] | undefined,
  t: Translate
): string | null {
  const count = vehicleCount ?? 0
  if (count > MAX_MISSION_VEHICLES) return t('missions.errChassis', { n: MAX_MISSION_VEHICLES })
  if (count <= 0) return null
  const vins = (chassisNumbers ?? []).slice(0, count)
  for (let i = 0; i < count; i++) {
    if (!isValidVinLength(vins[i] ?? '')) return t('missions.errChassis', { n: i + 1 })
  }
  if (new Set(vins).size !== vins.length) return t('missions.errChassisDuplicate')
  return null
}

export function validateMissionForm(form: TeamMissionInput, t: Translate): string | null {
  if (!form.title.trim()) return t('missions.errTitle')
  if (!form.assigneeIds.length) return t('missions.errAssignee')
  return validateChassisNumbers(form.vehicleCount, form.chassisNumbers, t)
}

export function buildMissionSaveInput(form: TeamMissionInput, editing: TeamMission | null): TeamMissionInput {
  const { parentModelId, variantModelId, vehicleCount, chassisNumbers, iplParts, ...rest } = form
  const count = vehicleCount ?? 0
  const vins = (chassisNumbers ?? []).slice(0, count).map(vin => vin.trim())
  const parts = iplParts ?? []
  const keepModels = Boolean(parentModelId || variantModelId || editing?.parentModelId || editing?.variantModelId)
  const keepChassis = count > 0 || Boolean(editing?.vehicleCount || editing?.chassisNumbers?.length)
  const keepParts = parts.length > 0 || Boolean(editing?.iplParts?.length)
  return {
    ...rest,
    title: form.title.trim(),
    description: form.description?.trim() || undefined,
    dueDate: form.dueDate || null,
    recurrenceType: form.recurrenceType ?? 'none',
    recurrenceCustom: form.recurrenceType === 'custom' ? form.recurrenceCustom?.trim() || null : null,
    notes: form.notes?.trim() || undefined,
    ...(keepModels
      ? {
          parentModelId: parentModelId || null,
          variantModelId: parentModelId ? variantModelId || null : null
        }
      : {}),
    ...(keepChassis
      ? {
          vehicleCount: count || null,
          chassisNumbers: count ? vins : []
        }
      : {}),
    ...(keepParts ? { iplParts: parts } : {})
  }
}

export function missionSaveErrorMessage(error: unknown, t: Translate): string {
  const msg = error instanceof Error ? error.message : t('common.error')
  if (msg === 'MISSION_MODELS_SCHEMA') return t('missions.errModelsSchema')
  if (msg === 'MISSION_CHASSIS_SCHEMA') return t('missions.errChassisSchema')
  if (msg === 'MISSION_PARTS_SCHEMA') return t('missions.errPartsSchema')
  return msg
}
