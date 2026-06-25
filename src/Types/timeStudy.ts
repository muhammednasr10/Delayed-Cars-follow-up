import type { TrainingLevel } from './enums'

export type ParsedHardware = {
  hardwareName: string
  hardwareQty: number | null
  hardwareType: string | null
  hardwareSize: string | null
}

export type ParsedOperation = {
  rowNumbers: number[]
  stationCode: string
  parentStationCode: string | null
  operationNameAr: string
  operationType: string
  toolSpec: string | null
  toolSpecPercent: string | null
  technicianPosition: string | null
  taskPrecedence: string | null
  rankedPositionalWeight: number | null
  zoningConstraints: string | null
  standardTimeSeconds: number | null
  standardTimeMinutes: number | null
  workerTimeMinutes: number | null
  stationTimeMinutes: number | null
  requiredManpowerCount: number | null
  averageStationTimePerWorker: number | null
  sequenceNo: number
  hardware: ParsedHardware[]
  vehicleModelName: string | null
  isStationHeaderOnly: boolean
}

export type ParsedStation = {
  code: string
  parentCode: string | null
  name: string
  stationType: string
  lineName: string | null
  sortOrder: number
  technicianPosition: string | null
  isGroupHeader: boolean
}

export type ParseResult = {
  stations: ParsedStation[]
  operations: ParsedOperation[]
  errors: { row: number; message: string }[]
  warnings: { row: number; message: string }[]
}

export type ImportDiffItem = {
  key: string
  entity: 'station' | 'operation' | 'hardware' | 'routing'
  action: 'create' | 'update' | 'skip' | 'conflict'
  label: string
  details?: string
}

export type ImportPreview = {
  parse: ParseResult
  diffs: ImportDiffItem[]
  counts: { stations: number; operations: number; hardware: number; routes: number }
}

export type VehicleModelFamily = {
  id: string
  familyCode: string
  nameAr: string | null
  nameEn: string | null
  isActive: boolean
}

export type OperationHardware = {
  id: string
  hardwareName: string
  hardwareQty: number | null
  hardwareType: string | null
  hardwareSize: string | null
}

export type StationOperationDetail = {
  id: string
  stationId: string
  stationNumber: string
  stationName: string
  operationCode: string
  operationNameAr: string
  operationNameEn: string | null
  operationType: string
  parentModelId: string | null
  parentModelName: string | null
  technicianPosition: string | null
  toolSpec: string | null
  standardTimeSeconds: number | null
  standardTimeMinutes: number | null
  workerTimeMinutes: number | null
  stationTimeMinutes: number | null
  requiredManpowerCount: number
  taskPrecedence: string | null
  rankedPositionalWeight: number | null
  zoningConstraints: string | null
  sequenceNo: number
  isCritical: boolean
  isActive: boolean
  notes: string | null
  hardware: OperationHardware[]
}

/** @deprecated Use WorkerOperationsGroup under ParentStationOperationsGroup */
export type StationOperationsGroup = {
  stationId: string
  stationNumber: string
  stationName: string
  worker1OperationsSummary: string | null
  sortOrder: number
  operations: StationOperationDetail[]
}

export type WorkerOperationsGroup = {
  stationId: string
  stationNumber: string
  displayCode: string
  workerIndex: number | null
  stationName: string
  worker1OperationsSummary: string | null
  sortOrder: number
  totalWorkerTimeMinutes: number
  operations: StationOperationDetail[]
}

export type ParentStationOperationsGroup = {
  stationId: string | null
  stationNumber: string
  displayCode: string
  stationName: string
  /** أشهر ما يُركّب في المحطة (من worker1_operations_summary) */
  worker1OperationsSummary: string | null
  workAreaId: string | null
  workAreaName: string | null
  lineName: string | null
  totalWorkers: number
  avgStationTimeMinutes: number | null
  /** From DB when set; otherwise derived from child worker lines */
  headcountWorkersOverride: number | null
  avgStationTimeOverride: number | null
  sortOrder: number
  workers: WorkerOperationsGroup[]
}

export type StationOperation = {
  id: string
  stationId: string
  operationCode: string
  operationNameAr: string
  operationNameEn: string | null
  operationType: string
  modelFamilyId: string | null
  technicianPosition: string | null
  toolSpec: string | null
  standardTimeMinutes: number | null
  requiredManpowerCount: number
  sequenceNo: number
  isCritical: boolean
  isActive: boolean
}

export type VehicleModelOperation = {
  id: string
  vehicleModelId: string | null
  modelFamilyId: string | null
  stationId: string
  operationId: string
  sequenceNo: number
  operationType: string
  requiredLevel: TrainingLevel
  isRequired: boolean
  isActive: boolean
}
