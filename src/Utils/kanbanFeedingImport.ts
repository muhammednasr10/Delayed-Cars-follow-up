import type { KanbanPartInput } from '../Types/kanbanFeeding'

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()]/g, '')
}

function findCol(headers: string[], ...candidates: string[]): number {
  const normed = headers.map(normHeader)
  for (const c of candidates) {
    const n = normHeader(c)
    const idx = normed.findIndex(h => h === n || h.includes(n) || n.includes(h))
    if (idx >= 0) return idx
  }
  return -1
}

function parseNum(val: string): number {
  const n = parseFloat(String(val ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

function cell(row: string[], col: number): string {
  return col >= 0 && col < row.length ? String(row[col] ?? '').trim() : ''
}

export type KanbanImportResult = {
  parts: KanbanPartInput[]
  skipped: number
  headerRow: number
}

/**
 * يقرأ ملف Excel/CSV لتغذية Kanban (تيجو 4 تربو وغيره).
 * الأعمدة المتوقعة: رقم الجزء، الكمية/سيارة، اتجاه الراك، أبعاد الكرتونة، حجم الراك، كمية الكرتونة.
 */
export function parseKanbanFeedingRows(rows: string[][]): KanbanImportResult {
  if (rows.length < 2) return { parts: [], skipped: 0, headerRow: 0 }

  let headerRow = 0
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const line = rows[i].join(' ').toLowerCase()
    if (
      /part|جزء|رقم/.test(line) &&
      (/qty|كمية|quantity|qv/.test(line) || /rack|راك/.test(line))
    ) {
      headerRow = i
      break
    }
  }

  const headers = rows[headerRow] ?? []
  const colPart = findCol(headers, 'part_number', 'part_no', 'part no', 'partno', 'رقم_الجزء', 'رقم الجزء', 'part')
  const colName = findCol(headers, 'part_name', 'part name', 'description', 'اسم_الجزء', 'اسم الجزء', 'name')
  const colQv = findCol(
    headers,
    'qty_per_vehicle',
    'qty per vehicle',
    'qv',
    'quantity',
    'كمية_في_السيارة',
    'كمية في السيارة',
    'qty'
  )
  const colDir = findCol(headers, 'direction', 'rack_direction', 'rack direction', 'اتجاه', 'اتجاه_الراك', 'side', 'r/l')
  const colCartonDim = findCol(
    headers,
    'carton_dimensions',
    'carton dimensions',
    'carton_size',
    'أبعاد_الكرتونة',
    'أبعاد الكرتونة',
    'dimensions',
    'l*w*h'
  )
  const colRack = findCol(headers, 'rack_qty', 'rack size', 'rack_size', 'rack_capacity', 'حجم_الراك', 'حجم الراك', 'سعة_الراك', 'rack')
  const colCartonQty = findCol(
    headers,
    'carton_qty',
    'carton quantity',
    'qty_carton',
    'كمية_الكرتونة',
    'كمية الكرتونة',
    'box_qty'
  )
  const colStation = findCol(headers, 'station', 'station_code', 'محطة', 'كود_المحطة')

  const parts: KanbanPartInput[] = []
  let skipped = 0

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(c => !String(c).trim())) continue

    const partNumber = cell(row, colPart >= 0 ? colPart : 0)
    if (!partNumber || /^total|إجمالي|sum/i.test(partNumber)) {
      skipped += 1
      continue
    }

    const qtyPerVehicle = parseNum(cell(row, colQv))
    const rackQty = parseNum(cell(row, colRack))
    const cartonQty = parseNum(cell(row, colCartonQty))

    if (qtyPerVehicle <= 0 && rackQty <= 0) {
      skipped += 1
      continue
    }

    parts.push({
      partNumber,
      partName: colName >= 0 ? cell(row, colName) : '',
      qtyPerVehicle: qtyPerVehicle || 1,
      rackDirection: colDir >= 0 ? cell(row, colDir) : '—',
      cartonDimensions: colCartonDim >= 0 ? cell(row, colCartonDim) : '—',
      cartonQty: cartonQty || rackQty || 1,
      rackQty: rackQty || cartonQty || 1,
      stationCode: colStation >= 0 ? cell(row, colStation) : '—'
    })
  }

  return { parts, skipped, headerRow }
}
