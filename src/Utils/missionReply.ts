export type MissionReplyCorrection = {
  parentModelId: string | null
  variantModelId: string | null
  vehicleCount: number | null
  chassisNumbers: string[]
}

export type MissionReply = {
  temporary: string
  corrective: string
  models: string
  modelsConfirmed: boolean
  chassis: string
  chassisConfirmed: boolean
  affectedQty: number
}

const KIND = 'mission-reply'

export function buildMissionReplySubmission(input: {
  temporary: string
  corrective: string
  modelsText: string
  parentModelId: string | null
  variantModelId: string | null
  vehicleCount: number | null
  chassisNumbers: string[]
}): { body: string; correction: MissionReplyCorrection } {
  const chassisNumbers = input.chassisNumbers.map(vin => vin.trim()).filter(Boolean)
  const correction: MissionReplyCorrection = {
    parentModelId: input.parentModelId,
    variantModelId: input.parentModelId ? input.variantModelId : null,
    vehicleCount: input.vehicleCount,
    chassisNumbers
  }
  return {
    correction,
    body: encodeMissionReply({
      temporary: input.temporary.trim(),
      corrective: input.corrective.trim(),
      models: input.modelsText,
      modelsConfirmed: true,
      chassis: chassisNumbers.join(' · '),
      chassisConfirmed: true,
      affectedQty: input.vehicleCount ?? 0
    })
  }
}

export function encodeMissionReply(reply: MissionReply): string {
  return JSON.stringify({ kind: KIND, ...reply })
}

export function parseMissionReply(body: string): MissionReply | null {
  try {
    const value = JSON.parse(body) as Partial<MissionReply> & { kind?: string }
    if (value?.kind !== KIND) return null
    if (typeof value.temporary !== 'string' || typeof value.corrective !== 'string') return null
    const qty = Number(value.affectedQty)
    if (!Number.isFinite(qty)) return null
    return {
      temporary: value.temporary,
      corrective: value.corrective,
      models: typeof value.models === 'string' ? value.models : '',
      modelsConfirmed: Boolean(value.modelsConfirmed),
      chassis: typeof value.chassis === 'string' ? value.chassis : '',
      chassisConfirmed: Boolean(value.chassisConfirmed),
      affectedQty: qty
    }
  } catch {
    return null
  }
}
