import type { BomImportValidation, ParsedBomRow } from '../Types/bom'
import { normalizePartNumber } from './partNumberNormalize'
import { T4_IPL_QTY_MAP } from './bomPartsColumns'

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()#]/g, '')
}

export function isT4IplSpreadsheet(headerRow: string[]): boolean {
  const headers = headerRow.map(normHeader)
  const hasPart = headers.some(h => h === 'part_number' || h.includes('part_number'))
  const hasSt = headers.includes('st')
  const hasT = headers.includes('t')
  const hasL = headers.includes('l')
  const hasC = headers.includes('c')
  return hasPart && hasSt && hasT && hasL && hasC
}

function headerIndex(headerRow: string[], ...candidates: string[]): number | null {
  const norms = headerRow.map(normHeader)
  for (const c of candidates) {
    const n = normHeader(c)
    const i = norms.findIndex(h => h === n || h.includes(n))
    if (i >= 0) return i
  }
  return null
}

function cell(row: string[], idx: number | null): string {
  if (idx == null || row[idx] == null) return ''
  return String(row[idx]).trim()
}

function parseQty(v: string): number {
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

function expandT4Models(t: number, l: number, c: number): { model: string; qty: number }[] {
  const out: { model: string; qty: number }[] = []
  if (t > 0) out.push({ model: 'T4T', qty: t })
  if (l > 0) out.push({ model: 'T4L', qty: l })
  if (c > 0) out.push({ model: 'T4C', qty: c })
  if (t > 0 && l > 0 && c > 0) {
    out.push({ model: 'T4', qty: Math.min(t, l, c) })
  }
  return out
}

export function parseT4IplSpreadsheetRows(rows: string[][]): BomImportValidation {
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

  const headerIdx = rows.findIndex(r => r.some(c => /part\s*number|part_number/i.test(String(c))))
  const headerRow = rows[headerIdx >= 0 ? headerIdx : 0]
  const dataStart = (headerIdx >= 0 ? headerIdx : 0) + 1

  const iPart = headerIndex(headerRow, 'PART NUMBER', 'part_number')
  const iPartNew = headerIndex(headerRow, 'PART NO. New', 'part_number_new')
  const iClass = headerIndex(headerRow, 'CLASSIFICATION', 'classification')
  const iNameAr = headerIndex(headerRow, 'PART NAME', 'part_name_ar')
  const iNameEn = headerIndex(headerRow, 'Part Name(EN)', 'part_name_en')
  const iSt = headerIndex(headerRow, 'ST', 'station_code')
  const iType = headerIndex(headerRow, 'Type', 'part_kind')
  const iPartClass = headerIndex(headerRow, 'Part class', 'part_class')
  const iT = headerIndex(headerRow, 'T')
  const iL = headerIndex(headerRow, 'L')
  const iC = headerIndex(headerRow, 'C')

  if (iPart == null) {
    errors.push({ row: headerIdx + 1, message: 'Missing PART NUMBER column' })
  }

  let missingPartNumber = 0
  let duplicateKeys = 0
  let needsReview = 0
  const seenKeys = new Set<string>()

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r]
    if (!row.some(c => String(c).trim())) continue

    const partNumber = cell(row, iPart) || cell(row, iPartNew)
    if (!partNumber) {
      missingPartNumber++
      continue
    }

    const stationCode = cell(row, iSt)
    const t = parseQty(cell(row, iT))
    const l = parseQty(cell(row, iL))
    const c = parseQty(cell(row, iC))
    const variants = expandT4Models(t, l, c)

    if (variants.length === 0) {
      warnings.push({ row: r + 1, message: 'No qty in T/L/C — row skipped' })
      continue
    }

    const raw: Record<string, string> = {}
    headerRow.forEach((h, i) => {
      if (h) raw[h] = String(row[i] ?? '')
    })

    const qtyByModelRaw = T4_IPL_QTY_MAP.map(m => {
      const q = m.col === 'T' ? t : m.col === 'L' ? l : c
      return `${m.model}=${q}`
    })
      .concat(t > 0 && l > 0 && c > 0 ? [`T4=${Math.min(t, l, c)}`] : [])
      .join('; ')

    for (const { model, qty } of variants) {
      const norm = normalizePartNumber(partNumber)
      const key = `${norm}|${stationCode}|${model}|${r + 1}`
      if (seenKeys.has(key)) duplicateKeys++
      else seenKeys.add(key)
      if (!stationCode) needsReview++

      parsed.push({
        rowNumber: r + 1,
        modelFamily: 'T4',
        applicableModels: ['T4', 'T4T', 'T4L', 'T4C'],
        stationCode,
        stationCategory: cell(row, iPartClass),
        partNumber,
        partNumberNew: cell(row, iPartNew),
        alternativePartNo: cell(row, headerIndex(headerRow, 'old Part Number', 'old_part_number')),
        partNameAr: cell(row, iNameAr),
        partNameEn: cell(row, iNameEn),
        partKind: cell(row, iType),
        bomClassification: cell(row, iClass),
        qtyByModelRaw,
        qtyByModel: [{ model, qty }],
        sourceSheet: 'IPL-T4',
        sourceRow: r + 1,
        importAction: 'upsert',
        raw
      })
    }
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
