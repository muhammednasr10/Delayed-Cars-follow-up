import type { BomImportValidation, ParsedBomRow } from '../Types/bom'
import { normalizeSupplySource } from './bomDisplayFormat'
import { sanitizePartNameEn } from './partNameEn'
import { normalizePartNumber } from './partNumberNormalize'

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()#]/g, '')
}

function hasT4QtyColumns(headers: string[]): boolean {
  const legacy = headers.includes('t') && headers.includes('l') && headers.includes('c')
  const named =
    headers.some(h => h.includes('t4t')) &&
    headers.some(h => h.includes('t4l')) &&
    headers.some(h => h.includes('t4c'))
  return legacy || named
}

export function isT4IplSpreadsheet(headerRow: string[]): boolean {
  const headers = headerRow.map(normHeader)
  const hasPart =
    headers.some(h => h === 'part_number' || h.includes('part_number') || h.includes('رقم_الجزء'))
  const hasSt = headers.includes('st') || headers.some(h => h.includes('محطة') || h === 'station')
  return hasPart && hasSt && hasT4QtyColumns(headers)
}

function headerIndex(headerRow: string[], ...candidates: string[]): number | null {
  const norms = headerRow.map(normHeader)
  for (const c of candidates) {
    const n = normHeader(c)
    const exactOnly = n.length <= 2
    const i = norms.findIndex(h => {
      if (h === n) return true
      if (exactOnly) return false
      // Avoid matching PART NAME when looking for part_name_en (n contains h).
      if (h.includes(n)) return true
      return false
    })
    if (i >= 0) return i
  }
  return null
}

function headerIndexEnglishName(headerRow: string[]): number | null {
  const norms = headerRow.map(normHeader)
  const exact = ['part_nameen', 'part_name_en', 'اسم_الجزء_بالانجليزى', 'اسم_الجزء_بالانجليزي']
  for (const n of exact) {
    const i = norms.indexOf(n)
    if (i >= 0) return i
  }
  const i = norms.findIndex(
    h =>
      h !== 'part_name' &&
      (/part_name.*en|english|انجليز/i.test(h) || h.endsWith('_en'))
  )
  return i >= 0 ? i : null
}

function cell(row: string[], idx: number | null): string {
  if (idx == null || row[idx] == null) return ''
  return String(row[idx]).trim()
}

function parseQty(v: string): number {
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Classification from shared part number across variants (IPL style). */
function t4ClassificationLabel(t: boolean, l: boolean, c: boolean): string {
  if (t && l && c) return 'Common'
  const parts: string[] = []
  if (t) parts.push('T')
  if (l) parts.push('L')
  if (c) parts.push('C')
  return parts.join('&')
}

export function parseT4IplSpreadsheetRows(rows: string[][], headerIdxOverride?: number): BomImportValidation {
  const errors: BomImportValidation['errors'] = []
  const warnings: BomImportValidation['warnings'] = []
  const parsed: ParsedBomRow[] = []

  if (rows.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Empty sheet' }],
      warnings: [],
      stats: { total: 0, missingPartNumber: 0, duplicateKeys: 0, needsReview: 0, sourceRows: 0, skippedNoQty: 0 }
    }
  }

  const headerIdx =
    headerIdxOverride ??
    rows.findIndex(r => r.some(c => /part\s*number|part_number|رقم\s*الجزء/i.test(String(c))))
  const headerRow = rows[headerIdx >= 0 ? headerIdx : 0]
  const dataStart = (headerIdx >= 0 ? headerIdx : 0) + 1

  const iPart = headerIndex(
    headerRow,
    'PART NUMBER',
    'part_number',
    'رقم الجزء',
    'رقم_الجزء'
  )
  const iPartNew = headerIndex(headerRow, 'PART NO. New', 'part_number_new')
  const iClass = headerIndex(headerRow, 'CLASSIFICATION', 'classification', 'التصنيف')
  const iNameAr = headerIndex(
    headerRow,
    'PART NAME',
    'part_name_ar',
    'اسم الجزء بالعربى',
    'اسم_الجزء_بالعربى',
    'اسم الجزء بالعربي'
  )
  const iNameEn =
    headerIndexEnglishName(headerRow) ??
    headerIndex(headerRow, 'Part Name(EN)', 'part_name_en', 'اسم الجزء بالانجليزى', 'اسم الجزء بالانجليزي')
  const iSt = headerIndex(headerRow, 'ST', 'station_code', 'المحطة', 'محطة')
  const iType = headerIndex(headerRow, 'Type', 'part_kind', 'نوع الجزء', 'نوع_الجزء')
  const iPartClass = headerIndex(
    headerRow,
    'Part class',
    'part_class',
    'تصنيف الجزء',
    'تصنيف_الجزء'
  )
  const iSupply = headerIndex(headerRow, 'CKD', 'ckd', 'supply_source', 'مصدر التوريد', 'المورد')
  const iT =
    headerIndex(headerRow, 'T', 'الكمية في T4T', 'الكمية_في_t4t', 't4t') ??
    headerIndex(headerRow, 'كمية t4t')
  const iL =
    headerIndex(headerRow, 'L', 'الكمية في T4L', 'الكمية_في_t4l', 't4l') ??
    headerIndex(headerRow, 'كمية t4l')
  const iC =
    headerIndex(headerRow, 'C', 'الكمية في T4C', 'الكمية_في_t4c', 't4c') ??
    headerIndex(headerRow, 'كمية t4c')

  if (iPart == null) {
    errors.push({ row: headerIdx + 1, message: 'Missing PART NUMBER column' })
  }

  const iOldPart = headerIndex(headerRow, 'old Part Number', 'old_part_number')

  type Group = {
    rowNumber: number
    partNumber: string
    partNumberNew: string
    alternativePartNo: string
    partNameAr: string
    partNameEn: string
    partKind: string
    supplySource: string
    stationCategory: string
    bomClassificationSheet: string
    stationCode: string
    t: number
    l: number
    c: number
    raw: Record<string, string>
  }

  const groups = new Map<string, Group>()
  let missingPartNumber = 0

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

    const norm = normalizePartNumber(partNumber)
    const key = `${norm}|${stationCode}`
    const raw: Record<string, string> = {}
    headerRow.forEach((h, i) => {
      if (h) raw[h] = String(row[i] ?? '')
    })

    const existing = groups.get(key)
    if (existing) {
      existing.t = Math.max(existing.t, t)
      existing.l = Math.max(existing.l, l)
      existing.c = Math.max(existing.c, c)
      if (!existing.partNameAr) existing.partNameAr = cell(row, iNameAr)
      if (!existing.partNameEn) existing.partNameEn = cell(row, iNameEn)
      if (!existing.partKind) existing.partKind = cell(row, iType)
      if (!existing.supplySource) existing.supplySource = normalizeSupplySource(cell(row, iSupply))
    } else {
      groups.set(key, {
        rowNumber: r + 1,
        partNumber,
        partNumberNew: cell(row, iPartNew),
        alternativePartNo: cell(row, iOldPart),
        partNameAr: cell(row, iNameAr),
        partNameEn: cell(row, iNameEn),
        partKind: cell(row, iType),
        supplySource: normalizeSupplySource(cell(row, iSupply)),
        stationCategory: cell(row, iPartClass),
        bomClassificationSheet: cell(row, iClass),
        stationCode,
        t,
        l,
        c,
        raw
      })
    }
  }

  let needsReview = 0
  let skippedNoQty = 0

  for (const g of groups.values()) {
    const variants: string[] = []
    if (g.t > 0) variants.push('T4T')
    if (g.l > 0) variants.push('T4L')
    if (g.c > 0) variants.push('T4C')

    if (variants.length === 0) {
      skippedNoQty++
      continue
    }

    const classification = t4ClassificationLabel(g.t > 0, g.l > 0, g.c > 0)
    const repQty = Math.max(g.t, g.l, g.c)
    const qtyByModelRaw = `T4T=${g.t}; T4L=${g.l}; T4C=${g.c}`
    if (!g.stationCode) needsReview++

    parsed.push({
      rowNumber: g.rowNumber,
      modelFamily: 'T4',
      applicableModels: variants,
      stationCode: g.stationCode,
      stationCategory: g.stationCategory,
      supplySource: g.supplySource,
      partNumber: g.partNumber,
      partNumberNew: g.partNumberNew,
      alternativePartNo: g.alternativePartNo,
      partNameAr: g.partNameAr,
      partNameEn: sanitizePartNameEn(g.partNameAr, g.partNameEn, g.raw),
      partKind: g.partKind,
      bomClassification: classification,
      qtyByModelRaw,
      qtyByModel: [{ model: '', qty: repQty }],
      sourceSheet: 'IPL-T4',
      sourceRow: g.rowNumber,
      importAction: 'upsert',
      raw: g.raw
    })
  }

  return {
    rows: parsed,
    errors,
    warnings,
    stats: {
      total: parsed.length,
      missingPartNumber,
      duplicateKeys: 0,
      needsReview,
      sourceRows: Math.max(0, rows.length - dataStart),
      skippedNoQty
    }
  }
}
