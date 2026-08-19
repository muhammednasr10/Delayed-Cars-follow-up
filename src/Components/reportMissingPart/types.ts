import type { MissingPartBatchLineInput } from '../../Types/missingPart'

export type IssueLineDraft = Omit<MissingPartBatchLineInput, 'partDescription'> & {
  key: string
  partItems: string[]
}

export type VehicleForm = {
  familyId: string
  modelId: string
  colorId: string | null
  notes: string
  vehicleCount: number
  vins: string[]
}

export type DuplicatePrompt = {
  vins: string[]
  vinIndex?: number
  pendingSubmit?: boolean
}

export const emptyVehicle: VehicleForm = {
  familyId: '',
  modelId: '',
  colorId: null,
  notes: '',
  vehicleCount: 1,
  vins: ['']
}

export function issuePartDescriptions(line: IssueLineDraft): string[] {
  return line.partItems.map(s => s.trim()).filter(Boolean)
}

export function resizeVins(count: number, prev: string[]): string[] {
  const n = Math.max(1, Math.min(count, 20))
  const next = [...prev]
  while (next.length < n) next.push('')
  return next.slice(0, n)
}

export function newIssueLine(): IssueLineDraft {
  return {
    key: crypto.randomUUID(),
    partItems: [''],
    requiredQty: 1,
    reason: '',
    department: '',
    stationId: null,
    completingDepartment: null,
    followUpEmployeeId: null,
    followUpEmployeeIds: []
  }
}
