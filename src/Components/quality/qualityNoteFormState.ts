import type {
  QualityNoteRecord,
  QualityNoteRepairTime,
  QualityNoteSeverity
} from '../../Types/qualityNote'

export type QualityNoteFormState = {
  vehicleModelIds: string[]
  stationId: string
  workerLineStationId: string
  category: string
  severity: QualityNoteSeverity
  repairTime: QualityNoteRepairTime
  notedAt: string
  description: string
  specifyVins: boolean
  vins: string[]
}

export function emptyQualityNoteForm(): QualityNoteFormState {
  return {
    vehicleModelIds: [],
    stationId: '',
    workerLineStationId: '',
    category: '',
    severity: 'recurring',
    repairTime: 'medium',
    notedAt: new Date().toISOString().slice(0, 10),
    description: '',
    specifyVins: false,
    vins: ['']
  }
}

export function qualityNoteRecordToForm(row: QualityNoteRecord): QualityNoteFormState {
  const hasVins = row.vins.length > 0
  return {
    vehicleModelIds: [...row.vehicleModelIds],
    stationId: row.stationId ?? '',
    workerLineStationId: row.workerLineStationId ?? '',
    category: row.category,
    severity: row.severity,
    repairTime: row.repairTime,
    notedAt: row.notedAt.slice(0, 10),
    description: row.description,
    specifyVins: hasVins,
    vins: hasVins ? [...row.vins] : ['']
  }
}
