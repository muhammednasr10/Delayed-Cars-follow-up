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

  status: LineEquipment['status']

  last_calibration_at: string | null

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

    status: row.status,

    lastCalibrationAt: row.last_calibration_at,

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



function toEquipmentPayload(input: LineEquipmentInput) {

  return {

    equipment_code: input.equipmentCode.trim().toUpperCase(),

    equipment_type: input.equipmentType,

    name: input.name?.trim() || null,

    model: input.model?.trim() || null,

    serial_number: input.serialNumber?.trim() || null,

    location: input.location?.trim() || null,

    status: input.status ?? 'active',

    notes: input.notes?.trim() || null

  }

}



const EQUIPMENT_SELECT = '*'

const TX_SELECT = '*, line_equipment(equipment_code, equipment_type, name)'



export async function getLineEquipment(type?: EquipmentType): Promise<LineEquipment[]> {

  let query = requireClient().from('line_equipment').select(EQUIPMENT_SELECT).order('equipment_code', { ascending: true })

  if (type) query = query.eq('equipment_type', type)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return ((data ?? []) as EquipmentRow[]).map(mapEquipment)

}



export async function createLineEquipment(input: LineEquipmentInput): Promise<LineEquipment> {

  const { data, error } = await requireClient().from('line_equipment').insert(toEquipmentPayload(input)).select(EQUIPMENT_SELECT).single()

  if (error) throw new Error(error.message)

  return mapEquipment(data as EquipmentRow)

}



export async function updateLineEquipment(id: string, input: LineEquipmentInput): Promise<LineEquipment> {

  const { data, error } = await requireClient()

    .from('line_equipment')

    .update(toEquipmentPayload(input))

    .eq('id', id)

    .select(EQUIPMENT_SELECT)

    .single()

  if (error) throw new Error(error.message)

  return mapEquipment(data as EquipmentRow)

}



export async function deleteLineEquipment(id: string): Promise<void> {

  const { error } = await requireClient().from('line_equipment').delete().eq('id', id)

  if (error) throw new Error(error.message)

}



export async function getLineEquipmentTransactions(

  filters?: { type?: EquipmentTransactionType; equipmentType?: EquipmentType }

): Promise<LineEquipmentTransaction[]> {

  let query = requireClient().from('line_equipment_transactions').select(TX_SELECT).order('occurred_at', { ascending: false })

  if (filters?.type) query = query.eq('transaction_type', filters.type)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  let rows = ((data ?? []) as TransactionRow[]).map(mapTransaction)

  if (filters?.equipmentType) rows = rows.filter(r => r.equipmentType === filters.equipmentType)

  return rows

}



async function syncEquipmentAfterCalibration(equipmentId: string, occurredAt: string, result: string, nextDue: string | null) {

  const patch: Record<string, unknown> = {

    last_calibration_at: occurredAt,

    next_calibration_due: nextDue

  }

  if (result === 'pass') patch.status = 'active'

  else patch.status = 'out_of_service'

  const { error } = await requireClient().from('line_equipment').update(patch).eq('id', equipmentId)

  if (error) throw new Error(error.message)

}



async function syncEquipmentAfterScrap(equipmentId: string) {

  const { error } = await requireClient().from('line_equipment').update({ status: 'scrapped' }).eq('id', equipmentId)

  if (error) throw new Error(error.message)

}



export async function createCalibrationTransaction(input: CalibrationTransactionInput): Promise<LineEquipmentTransaction> {

  const payload = {

    equipment_id: input.equipmentId,

    transaction_type: 'calibration' as const,

    occurred_at: input.occurredAt,

    calibration_result: input.calibrationResult,

    next_calibration_due: input.nextCalibrationDue || null,

    notes: input.notes?.trim() || null

  }

  const { data, error } = await requireClient().from('line_equipment_transactions').insert(payload).select(TX_SELECT).single()

  if (error) throw new Error(error.message)

  await syncEquipmentAfterCalibration(input.equipmentId, input.occurredAt, input.calibrationResult, input.nextCalibrationDue ?? null)

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

  const { data, error } = await requireClient().from('line_equipment_transactions').insert(payload).select(TX_SELECT).single()

  if (error) throw new Error(error.message)

  await syncEquipmentAfterScrap(input.equipmentId)

  return mapTransaction(data as TransactionRow)

}



export async function deleteLineEquipmentTransaction(id: string): Promise<void> {
  const { error } = await requireClient().from('line_equipment_transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

