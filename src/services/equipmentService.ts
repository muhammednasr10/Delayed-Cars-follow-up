import { supabase } from '../lib/supabase'
import type {
  CalibrationTransactionInput,
  EquipmentTransactionType,
  EquipmentType,
  LineEquipment,
  LineEquipmentInput,
  LineEquipmentTransaction,
  ScrapTransactionInput
} from '../Types/equipment'

function requireClient() {
  if (!supabase) throw new Error('Supabase غير مهيأ. تحقق من ملف .env')
  return supabase
}

type EquipmentRow = {
  id: string
  equipment_code: string
  equipment_type: LineEquipment['equipmentType']
  name: string | null
  model: string | null
  serial_number: string | null
  location: string | null
  org_unit_id?: string | null
  assigned_employee_id?: string | null
  worker_common_name?: string | null
  status: LineEquipment['status']
  operating_range?: string | null
  efficiency_percent?: number | string | null
  last_calibration_at: string | null
  last_calibration_result?: LineEquipment['lastCalibrationResult']
  next_calibration_due: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type TransactionRow = {
  id: string
  equipment_id: string
  transaction_type: LineEquipmentTransaction['transactionType']
  occurred_at: string
  calibration_result: LineEquipmentTransaction['calibrationResult']
  next_calibration_due: string | null
  scrap_reason: string | null
  scrap_qty: number | null
  notes: string | null
  created_at: string
  line_equipment?:
    | { equipment_code: string; equipment_type: EquipmentType; name: string | null }
    | { equipment_code: string; equipment_type: EquipmentType; name: string | null }[]
    | null
}

function mapEquipment(row: EquipmentRow): LineEquipment {
  return {
    id: row.id,
    equipmentCode: row.equipment_code,
    equipmentType: row.equipment_type,
    name: row.name,
    model: row.model,
    serialNumber: row.serial_number,
    location: row.location,
    orgUnitId: row.org_unit_id ?? null,
    assignedEmployeeId: row.assigned_employee_id ?? null,
    workerCommonName: row.worker_common_name || '',
    status: row.status,
    operatingRange: row.operating_range || '',
    efficiencyPercent:
      row.efficiency_percent == null || row.efficiency_percent === ''
        ? null
        : Number(row.efficiency_percent),
    lastCalibrationAt: row.last_calibration_at,
    lastCalibrationResult: row.last_calibration_result ?? null,
    nextCalibrationDue: row.next_calibration_due,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTransaction(row: TransactionRow): LineEquipmentTransaction {
  const eq = Array.isArray(row.line_equipment) ? row.line_equipment[0] : row.line_equipment
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentCode: eq?.equipment_code ?? '—',
    equipmentType: eq?.equipment_type ?? 'other',
    equipmentName: eq?.name ?? null,
    transactionType: row.transaction_type,
    occurredAt: row.occurred_at,
    calibrationResult: row.calibration_result,
    nextCalibrationDue: row.next_calibration_due,
    scrapReason: row.scrap_reason,
    scrapQty: row.scrap_qty,
    notes: row.notes,
    createdAt: row.created_at
  }
}

function isMissingOptionalCol(message: string, column: string): boolean {
  return (
    new RegExp(column, 'i').test(message) &&
    /schema cache|does not exist|could not find/i.test(message)
  )
}

function toEquipmentPayload(
  input: LineEquipmentInput,
  opts?: {
    includeAssignment?: boolean
    includeCalResult?: boolean
    includeEfficiency?: boolean
    includeOperatingRange?: boolean
    includeWorkerCommonName?: boolean
  }
) {
  const row: Record<string, unknown> = {
    equipment_code: input.equipmentCode.trim().toUpperCase(),
    equipment_type: input.equipmentType,
    name: input.name?.trim() || null,
    model: input.model?.trim() || null,
    serial_number: input.serialNumber?.trim() || null,
    location: input.location?.trim() || null,
    status: input.status ?? 'active',
    last_calibration_at: input.lastCalibrationAt || null,
    next_calibration_due: input.nextCalibrationDue || null,
    notes: input.notes?.trim() || null
  }
  if (opts?.includeAssignment !== false) {
    row.org_unit_id = input.orgUnitId || null
    row.assigned_employee_id = input.assignedEmployeeId || null
  }
  if (opts?.includeCalResult !== false) {
    row.last_calibration_result = input.lastCalibrationResult || null
  }
  if (opts?.includeEfficiency !== false) {
    row.efficiency_percent =
      input.efficiencyPercent == null || Number.isNaN(input.efficiencyPercent)
        ? null
        : input.efficiencyPercent
  }
  if (opts?.includeOperatingRange !== false) {
    row.operating_range = (input.operatingRange || '').trim()
  }
  if (opts?.includeWorkerCommonName !== false) {
    row.worker_common_name = (input.workerCommonName || '').trim()
  }
  return row
}

const EQUIPMENT_SELECT = '*'
const TX_SELECT = '*, line_equipment(equipment_code, equipment_type, name)'

export async function getLineEquipment(type?: EquipmentType): Promise<LineEquipment[]> {
  let query = requireClient()
    .from('line_equipment')
    .select(EQUIPMENT_SELECT)
    .order('equipment_code', { ascending: true })
  if (type) query = query.eq('equipment_type', type)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return ((data ?? []) as EquipmentRow[]).map(mapEquipment)
}

async function writeLineEquipment(
  input: LineEquipmentInput,
  write: (
    payload: Record<string, unknown>
  ) => Promise<{ data: EquipmentRow | null; error: { message: string } | null }>
): Promise<LineEquipment> {
  const attempts: {
    includeAssignment?: boolean
    includeCalResult?: boolean
    includeEfficiency?: boolean
    includeOperatingRange?: boolean
    includeWorkerCommonName?: boolean
  }[] = [
    {},
    { includeWorkerCommonName: false },
    { includeOperatingRange: false },
    { includeEfficiency: false },
    { includeCalResult: false },
    { includeAssignment: false },
    {
      includeAssignment: false,
      includeCalResult: false,
      includeEfficiency: false,
      includeOperatingRange: false,
      includeWorkerCommonName: false
    }
  ]
  let lastMessage = ''
  for (const opts of attempts) {
    const { data, error } = await write(toEquipmentPayload(input, opts))
    if (!error && data) return mapEquipment(data)
    lastMessage = error?.message ?? lastMessage
    const missingCal = isMissingOptionalCol(lastMessage, 'last_calibration_result')
    const missingOrg =
      isMissingOptionalCol(lastMessage, 'org_unit_id') || isMissingOptionalCol(lastMessage, 'assigned_employee_id')
    const missingEff = isMissingOptionalCol(lastMessage, 'efficiency_percent')
    const missingRange = isMissingOptionalCol(lastMessage, 'operating_range')
    const missingCommon = isMissingOptionalCol(lastMessage, 'worker_common_name')
    if (!missingCal && !missingOrg && !missingEff && !missingRange && !missingCommon) break
  }
  throw new Error(lastMessage)
}

export async function createLineEquipment(input: LineEquipmentInput): Promise<LineEquipment> {
  const client = requireClient()
  return writeLineEquipment(input, payload =>
    client.from('line_equipment').insert(payload).select(EQUIPMENT_SELECT).single()
  )
}

export async function updateLineEquipment(id: string, input: LineEquipmentInput): Promise<LineEquipment> {
  const client = requireClient()
  return writeLineEquipment(input, payload =>
    client.from('line_equipment').update(payload).eq('id', id).select(EQUIPMENT_SELECT).single()
  )
}

export async function deleteLineEquipment(id: string): Promise<void> {
  const { error } = await requireClient().from('line_equipment').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getLineEquipmentTransactions(filters?: {
  type?: EquipmentTransactionType
  equipmentType?: EquipmentType
}): Promise<LineEquipmentTransaction[]> {
  let query = requireClient()
    .from('line_equipment_transactions')
    .select(TX_SELECT)
    .order('occurred_at', { ascending: false })
  if (filters?.type) query = query.eq('transaction_type', filters.type)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  let rows = ((data ?? []) as TransactionRow[]).map(mapTransaction)
  if (filters?.equipmentType) rows = rows.filter(r => r.equipmentType === filters.equipmentType)
  return rows
}

async function syncEquipmentAfterCalibration(
  equipmentId: string,
  occurredAt: string,
  result: string,
  nextDue: string | null
) {
  const patch: Record<string, unknown> = {
    last_calibration_at: occurredAt,
    last_calibration_result: result,
    next_calibration_due: nextDue
  }
  const client = requireClient()
  let { error } = await client.from('line_equipment').update(patch).eq('id', equipmentId)
  if (error && isMissingOptionalCol(error.message, 'last_calibration_result')) {
    const retry = await client
      .from('line_equipment')
      .update({ last_calibration_at: occurredAt, next_calibration_due: nextDue })
      .eq('id', equipmentId)
    error = retry.error
  }
  if (error) throw new Error(error.message)
}

async function syncEquipmentAfterScrap(equipmentId: string) {
  const { error } = await requireClient().from('line_equipment').update({ status: 'scrapped' }).eq('id', equipmentId)
  if (error) throw new Error(error.message)
}

export async function createCalibrationTransaction(
  input: CalibrationTransactionInput
): Promise<LineEquipmentTransaction> {
  const payload = {
    equipment_id: input.equipmentId,
    transaction_type: 'calibration' as const,
    occurred_at: input.occurredAt,
    calibration_result: input.calibrationResult,
    next_calibration_due: input.nextCalibrationDue || null,
    notes: input.notes?.trim() || null
  }
  const { data, error } = await requireClient()
    .from('line_equipment_transactions')
    .insert(payload)
    .select(TX_SELECT)
    .single()
  if (error) throw new Error(error.message)
  await syncEquipmentAfterCalibration(
    input.equipmentId,
    input.occurredAt,
    input.calibrationResult,
    input.nextCalibrationDue ?? null
  )
  return mapTransaction(data as TransactionRow)
}

export async function createScrapTransaction(input: ScrapTransactionInput): Promise<LineEquipmentTransaction> {
  const payload = {
    equipment_id: input.equipmentId,
    transaction_type: 'scrap' as const,
    occurred_at: input.occurredAt,
    scrap_reason: input.scrapReason.trim(),
    scrap_qty: input.scrapQty ?? null,
    notes: input.notes?.trim() || null
  }
  const { data, error } = await requireClient()
    .from('line_equipment_transactions')
    .insert(payload)
    .select(TX_SELECT)
    .single()
  if (error) throw new Error(error.message)
  await syncEquipmentAfterScrap(input.equipmentId)
  return mapTransaction(data as TransactionRow)
}

export async function deleteLineEquipmentTransaction(id: string): Promise<void> {
  const { error } = await requireClient().from('line_equipment_transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
