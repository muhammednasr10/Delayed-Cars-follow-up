import type { EntryProductivityDay } from '../Types/entryProductivity'
import type { VehicleModel } from '../Types/settings'
import { modelDisplayLabel } from '../services/entryProductivityService'

export type ModelProductivityBreakdownRow = {
  modelId: string
  modelLabel: string
  entry: number
  exit: number
}

export function buildModelProductivityBreakdown(
  entryRecords: EntryProductivityDay[],
  exitRecords: EntryProductivityDay[],
  models: VehicleModel[],
  workDate?: string
): ModelProductivityBreakdownRow[] {
  const labelById = new Map(models.map(m => [m.id, modelDisplayLabel(m)]))
  const byModel = new Map<string, { entry: number; exit: number }>()

  function add(records: EntryProductivityDay[], field: 'entry' | 'exit') {
    for (const record of records) {
      if (workDate && record.workDate !== workDate) continue
      if (record.quantity <= 0) continue
      const row = byModel.get(record.modelId) ?? { entry: 0, exit: 0 }
      row[field] += record.quantity
      byModel.set(record.modelId, row)
    }
  }

  add(entryRecords, 'entry')
  add(exitRecords, 'exit')

  return [...byModel.entries()]
    .map(([modelId, values]) => ({
      modelId,
      modelLabel: labelById.get(modelId) ?? modelId,
      entry: values.entry,
      exit: values.exit
    }))
    .filter(row => row.entry > 0 || row.exit > 0)
    .sort((a, b) => a.modelLabel.localeCompare(b.modelLabel, 'ar'))
}
