export type EntryProductivityDay = {
  id: string
  modelId: string
  workDate: string
  quantity: number
  notes: string | null
}

export type EntryProductivityDayInput = {
  modelId: string
  workDate: string
  quantity: number
  notes?: string | null
}

export type EntryProductivityModelRow = {
  modelId: string
  modelLabel: string
  days: Record<string, number>
  monthTotal: number
}
