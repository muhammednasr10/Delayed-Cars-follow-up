import type { ParsedBomRow, BomImportValidation } from '../Types/bom'
import { normalizePartNumber, parseQtyByModel } from './partNumberNormalize'
import { isT4IplSpreadsheet, parseT4IplSpreadsheetRows } from './t4IplImportParser'

const HEADER_ALIASES: Record<string, string[]> = {
  model_family: ['model_family', 'model family', 'عائلة الموديل', 'model_family'],
  applicable_models: ['applicable_models', 'applicable models', 'الموديلات', 'applicable models'],
  station_code: ['station_code', 'station', 'station code', 'المحطة', 'st', 'station name'],
  station_category: ['station_category', 'station category', 'تصنيف المحطة'],
  part_number: ['part_number', 'part number', 'part no', 'pn', 'p/n', 'رقم الجزء', 'part no.', 'part number'],
  part_number_new: ['part_number_new', 'part no. new', 'part number new'],
  alternative_part_no: ['alternative_part_no', 'alternative part', 'alternative part no'],
  part_name_ar: ['part_name_ar', 'part name', 'arabic name', 'الاسم بالعربية'],
  part_name_en: ['part_name_en', 'english name', 'part name(en)', 'part name_en'],
  part_kind: ['part_kind', 'part kind', 'parts/hw', 'parts/h/w', 'type'],
  part_class: ['part_class', 'part class'],
  bom_classification: ['bom_classification', 'new part class', 'classification', 'class', 'التصنيف'],
  qty_by_model: ['qty_by_model', 'quantity', 'qty', 'الكمية'],
  source_sheet: ['source_sheet', 'source sheet'],
  source_row: ['source_row', 'source row', 'row'],
  import_action: ['import_action', 'import action']
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '_')
    .replace(/[().]/g, '')
}

function mapHeaders(headerRow: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  headerRow.forEach((h, i) => {
    const n = normHeader(h)
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some(a => normHeader(a) === n || n.includes(normHeader(a)))) {
        if (idx[field] == null) idx[field] = i
      }
    }
  })
  return idx
}

function cell(row: string[], col: Record<string, number>, field: string): string {
  const i = col[field]
  return i != null && row[i] != null ? String(row[i]).trim() : ''
}

function splitModels(raw: string): string[] {
  return raw
    .split(/[,،]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function parseBomSpreadsheetRows(rows: string[][]): BomImportValidation {
  const errors: BomImportValidation['errors'] = []
  const warnings: BomImportValidation['warnings'] = []
  const parsed: ParsedBomRow[] = []

  if (rows.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Empty sheet' }],
      warnings: [],
      stats: { total: 0, missingPartNumber: 0, duplicateKeys: 0, needsReview: 0 }
    }
  }

  const headerIdx = rows.findIndex(r => r.some(c => /part|رقم|station|محطة|model/i.test(String(c))))
  const headerRow = rows[headerIdx >= 0 ? headerIdx : 0]

  if (isT4IplSpreadsheet(headerRow)) {
    return parseT4IplSpreadsheetRows(rows)
  }

  const col = mapHeaders(headerRow)
  const dataStart = (headerIdx >= 0 ? headerIdx : 0) + 1

  if (col.part_number == null) {
    errors.push({ row: headerIdx + 1, message: 'Missing Part Number column' })
  }

  const seenKeys = new Set<string>()
  let missingPartNumber = 0
  let duplicateKeys = 0
  let needsReview = 0

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r]
    if (!row.some(c => String(c).trim())) continue

    const partNumber = cell(row, col, 'part_number') || cell(row, col, 'part_number_new')
    if (!partNumber) {
      missingPartNumber++
      errors.push({ row: r + 1, message: 'Missing part number' })
      continue
    }

    const modelFamily = cell(row, col, 'model_family')
    const applicableRaw = cell(row, col, 'applicable_models')
    const applicableModels = splitModels(applicableRaw)
    const stationCode = cell(row, col, 'station_code')
    const qtyRaw = cell(row, col, 'qty_by_model')
    const qtyByModel = parseQtyByModel(qtyRaw)

    const modelsForRows =
      applicableModels.length > 0
        ? applicableModels
        : qtyByModel.filter(q => q.model).map(q => q.model)

    const expandedModels = modelsForRows.length ? modelsForRows : ['']

    for (const modelName of expandedModels) {
      const qty =
        qtyByModel.find(q => q.model.toUpperCase() === modelName.toUpperCase())?.qty ??
        qtyByModel.find(q => !q.model)?.qty ??
        1

      const norm = normalizePartNumber(partNumber)
      const key = `${norm}|${stationCode}|${modelName}|${modelFamily}|${r + 1}`
      if (seenKeys.has(key)) duplicateKeys++
      else seenKeys.add(key)

      const needsRev = !stationCode || (!modelFamily && !modelName)
      if (needsRev) needsReview++

      const raw: Record<string, string> = {}
      row.forEach((c, i) => {
        const h = headerRow[i]
        if (h) raw[h] = String(c)
      })

      parsed.push({
        rowNumber: r + 1,
        modelFamily,
        applicableModels,
        stationCode,
        stationCategory: cell(row, col, 'station_category'),
        partNumber,
        partNumberNew: cell(row, col, 'part_number_new'),
        alternativePartNo: cell(row, col, 'alternative_part_no'),
        partNameAr: cell(row, col, 'part_name_ar'),
        partNameEn: cell(row, col, 'part_name_en'),
        partKind: cell(row, col, 'part_kind'),
        bomClassification: cell(row, col, 'bom_classification'),
        qtyByModelRaw: qtyRaw,
        qtyByModel: [{ model: modelName, qty }],
        sourceSheet: cell(row, col, 'source_sheet'),
        sourceRow: Number(cell(row, col, 'source_row')) || r + 1,
        importAction: cell(row, col, 'import_action') || 'upsert',
        raw
      })
    }

    if (!stationCode) warnings.push({ row: r + 1, message: 'Missing station — will flag needs_review' })
  }

  return {
    rows: parsed,
    errors,
    warnings,
    stats: {
      total: parsed.length,
      missingPartNumber,
      duplicateKeys,
      needsReview
    }
  }
}
