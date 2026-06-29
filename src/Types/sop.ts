export type SopWorkerInstruction = {
  workerStationId: string
  modelFamilyId: string
  stationInstructions: string
}

export type SopOperationInstruction = {
  operationId: string
  instructions: string
}

export type SopFamilyBundle = {
  workers: SopWorkerInstruction[]
  operations: SopOperationInstruction[]
}
