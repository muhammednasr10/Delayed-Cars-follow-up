import type { BomImportValidation, ParsedBomRow } from '../Types/bom'
import { normalizeSupplySource } from './bomDisplayFormat'
import { sanitizePartNameEn } from './partNameEn'
import { normalizePartNumber } from './partNumberNormalize'

const EMPTY_STATS = {
  total: 0,
  missingPartNumber: 0,
  duplicateKeys: 0,
  needsReview: 0,
  sourceRows: 0,
  skippedNoQty: 0
}

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '_')
    .replace(/[()#'"]/g, '')
}

function headerIndex(headerRow: string[], ...candidates: string[]): number | null {
  const norms = headerRow.map(normHeader)
  for (const c of candidates) {
    const n = normHeader(c)
    const exactOnly = n.length <= 2
    const i = norms.findIndex(h => {
      if (h === n) return true
      if (exactOnly) return false
      return h.includes(n)
    })
    if (i >= 0) return i
  }
  return null
}

function headerIndexEnglishName(headerRow: string[]): number | null {
  const norms = headerRow.map(normHeader)
  for (const n of ['part_nameen', 'part_name_en', 'english_name', 'اسم_الجزء_بالانجليزى', 'اسم_الجزء_بالانجليزي']) {
    const i = norms.indexOf(n)
    if (i >= 0) return i
  }
  const i = norms.findIndex(
    h => h !== 'part_name' && (/part_name.*en|english|انجليز/i.test(h) || h.endsWith('_en'))
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

function emptyValidation(): BomImportValidation {
  return { rows: [], errors: [{ row: 0, message: 'Empty sheet' }], warnings: [], stats: { ...EMPTY_STATS } }
}

function classificationFromFlags(flags: { label: string; active: boolean }[]): string {
  const active = flags.filter(f => f.active)
  if (active.length === flags.length && flags.length > 1) return 'Common'
  return active.map(f => f.label).join('&')
}

type VariantColumn = { header?: string; modelName: string; flag: string; fixedQty?: number }

type GroupedSheetConfig = {
  rows: string[][]
  headerIdxOverride?: number
  sourceSheet: string
  modelFamily: string
  variantColumns: VariantColumn[]
  partHeaders: string[]
  stationHeaders: string[]
  nameArHeaders: string[]
  nameEnHeaders?: string[]
  partKindHeaders: string[]
  supplyHeaders: string[]
  classHeaders: string[]
  partClassHeaders?: string[]
  partNewHeaders?: string[]
  altPartHeaders?: string[]
}

function parseGroupedVariantSheet(cfg: GroupedSheetConfig): BomImportValidation {
  const { rows } = cfg
  if (rows.length < 2) return emptyValidation()

  const headerIdx =
    cfg.headerIdxOverride ??
    rows.findIndex(r => r.some(c => /part\s*number|part\s*no|part_number|رقم\s*الجزء/i.test(String(c))))
  const headerRow = rows[headerIdx >= 0 ? headerIdx : 0]
  const dataStart = (headerIdx >= 0 ? headerIdx : 0) + 1

  const iPart = headerIndex(headerRow, ...cfg.partHeaders)
  const iPartNew = cfg.partNewHeaders ? headerIndex(headerRow, ...cfg.partNewHeaders) : null
  const iAlt = cfg.altPartHeaders ? headerIndex(headerRow, ...cfg.altPartHeaders) : null
  const iClass = headerIndex(headerRow, ...cfg.classHeaders)
  const iNameAr = headerIndex(headerRow, ...cfg.nameArHeaders)
  const iNameEn =
    (cfg.nameEnHeaders ? headerIndex(headerRow, ...cfg.nameEnHeaders) : null) ??
    headerIndexEnglishName(headerRow)
  const iSt = headerIndex(headerRow, ...cfg.stationHeaders)
  const iKind = cfg.partKindHeaders.length > 0 ? headerIndex(headerRow, ...cfg.partKindHeaders) : null
  const iPartClass = cfg.partClassHeaders ? headerIndex(headerRow, ...cfg.partClassHeaders) : null
  const iSupply = headerIndex(headerRow, ...cfg.supplyHeaders)
  const variantIdx = cfg.variantColumns.map(v => ({
    ...v,
    index: v.header ? headerIndex(headerRow, v.header) : null
  }))

  const errors: BomImportValidation['errors'] = []
  if (iPart == null) errors.push({ row: headerIdx + 1, message: 'Missing part number column' })

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
    qtyByFlag: Map<string, number>
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
    const key = `${normalizePartNumber(partNumber)}|${stationCode}`
    const raw: Record<string, string> = {}
    headerRow.forEach((h, i) => {
      if (h) raw[h] = String(row[i] ?? '')
    })

    const qtyByFlag = new Map<string, number>()
    for (const v of variantIdx) {
      const q = v.fixedQty ?? parseQty(cell(row, v.index))
      qtyByFlag.set(v.flag, Math.max(qtyByFlag.get(v.flag) ?? 0, q))
    }

    const existing = groups.get(key)
    if (existing) {
      for (const [flag, q] of qtyByFlag) {
        existing.qtyByFlag.set(flag, Math.max(existing.qtyByFlag.get(flag) ?? 0, q))
      }
      if (!existing.partNameAr) existing.partNameAr = cell(row, iNameAr)
      if (!existing.partNameEn) existing.partNameEn = cell(row, iNameEn)
      if (!existing.partKind) existing.partKind = cell(row, iKind)
      if (!existing.supplySource) existing.supplySource = normalizeSupplySource(cell(row, iSupply))
    } else {
      groups.set(key, {
        rowNumber: r + 1,
        partNumber,
        partNumberNew: cell(row, iPartNew),
        alternativePartNo: cell(row, iAlt),
        partNameAr: cell(row, iNameAr),
        partNameEn: cell(row, iNameEn),
        partKind: cell(row, iKind),
        supplySource: normalizeSupplySource(cell(row, iSupply)),
        stationCategory: cell(row, iPartClass),
        bomClassificationSheet: cell(row, iClass),
        stationCode,
        qtyByFlag,
        raw
      })
    }
  }

  const parsed: ParsedBomRow[] = []
  let needsReview = 0
  let skippedNoQty = 0

  for (const g of groups.values()) {
    const variants: string[] = []
    const qtyParts: string[] = []
    const flags: { label: string; active: boolean }[] = []

    for (const v of cfg.variantColumns) {
      const q = g.qtyByFlag.get(v.flag) ?? 0
      flags.push({ label: v.flag, active: q > 0 })
      if (q > 0) {
        variants.push(v.modelName)
        qtyParts.push(`${v.modelName}=${q}`)
      }
    }

    if (variants.length === 0) {
      skippedNoQty++
      continue
    }

    if (!g.stationCode) needsReview++

    const repQty = Math.max(...[...g.qtyByFlag.values()].filter(q => q > 0), 1)
    parsed.push({
      rowNumber: g.rowNumber,
      modelFamily: cfg.modelFamily,
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
      bomClassification: classificationFromFlags(flags) || g.bomClassificationSheet,
      qtyByModelRaw: qtyParts.join('; '),
      qtyByModel: [{ model: '', qty: repQty }],
      sourceSheet: cfg.sourceSheet,
      sourceRow: g.rowNumber,
      importAction: 'upsert',
      raw: g.raw
    })
  }

  return {
    rows: parsed,
    errors,
    warnings: [],
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

const T_LINE_COLUMNS = {
  partHeaders: ['PART NUMBER', 'PART NO.', 'part_number'],
  partNewHeaders: ['PART NO. New'],
  altPartHeaders: ['old Part Number', 'alternative_part_no', 'P/No. Alternatives', 'Alternative Part No.'],
  classHeaders: ['CLASSIFICATION', 'Class', 'classification'],
  nameArHeaders: ['PART NAME', 'Arabic Name', 'part_name_ar'],
  nameEnHeaders: ['Part Name(EN)', 'ENGLISH NAME', 'PART NAME'],
  partKindHeaders: ['Part class', 'Parts/H/W', 'Parts/HW'],
  partClassHeaders: ['Part class'],
  supplyHeaders: ['Type', 'STATUS', 'CKD', 'TYPE'],
  stationHeaders: ['ST', 'Station', 'station_code']
}

function grouped(
  sourceSheet: string,
  modelFamily: string,
  variantColumns: VariantColumn[],
  overrides: Partial<GroupedSheetConfig> = {}
): (rows: string[][], headerIdx?: number) => BomImportValidation {
  return (rows, headerIdx) =>
    parseGroupedVariantSheet({
      rows,
      headerIdxOverride: headerIdx,
      sourceSheet,
      modelFamily,
      variantColumns,
      ...T_LINE_COLUMNS,
      ...overrides
    })
}

const IPL_PARSERS: {
  test: (headerRow: string[], sheetName: string) => boolean
  parse: (rows: string[][], headerIdx?: number) => BomImportValidation
}[] = [
  {
    test: (h, sn) => /ipl.*t4|t4.*ipl/i.test(sn) || isT4Headers(h),
    parse: grouped('IPL-T4', 'T4', [
      { header: 'T', modelName: 'T4T', flag: 'T' },
      { header: 'L', modelName: 'T4L', flag: 'L' },
      { header: 'C', modelName: 'T4C', flag: 'C' }
    ])
  },
  {
    test: (h, sn) => /ipl.*t7|t7.*ipl/i.test(sn) || isT7Headers(h),
    parse: grouped(
      'IPL-T7',
      'T7',
      [
        { header: 'T7-HL', modelName: 'T7H', flag: 'H' },
        { header: 'T7-BL', modelName: 'T7B', flag: 'B' }
      ],
      { partHeaders: ['PART NO. Old', 'PART NUMBER', 'PART NO.'] }
    )
  },
  {
    test: (h, sn) => /ipl.*t8|t8.*ipl/i.test(sn) || isT8Headers(h),
    parse: grouped('IPL-T8', 'T8', [
      { header: 'L7', modelName: 'T8L7', flag: 'L7' },
      { header: 'L5', modelName: 'T8L5', flag: 'L5' },
      { header: 'C7', modelName: 'T8C7', flag: 'C7' }
    ])
  },
  {
    test: (h, sn) => isGdF12Headers(h, sn),
    parse: grouped(
      'IPL-GD-F12',
      'GD',
      [{ modelName: 'F12', flag: 'F12', fixedQty: 1 }],
      {
        altPartHeaders: ['Alternative Part No.1', 'Alternative Part No.2'],
        partKindHeaders: []
      }
    )
  },
  {
    test: (h, sn) => isGdF10Headers(h, sn),
    parse: grouped(
      'IPL-GD-F10',
      'GD',
      [
        { header: "F10-Q'TY", modelName: 'F10', flag: 'F10' },
        { header: "k51-Q'TY", modelName: 'K51', flag: 'K51' },
        { header: "k50-Q'TY", modelName: 'K50', flag: 'K50' }
      ],
      {
        partHeaders: ['PART NO.', 'PART NUMBER'],
        nameEnHeaders: ['ENGLISH NAME', 'Part Name'],
        partKindHeaders: []
      }
    )
  }
]

function isT4Headers(headerRow: string[]): boolean {
  const headers = headerRow.map(normHeader)
  const hasPart = headers.some(h => h.includes('part_number'))
  const hasSt = headers.includes('st') || headers.includes('station')
  const hasTlc = headers.includes('t') && headers.includes('l') && headers.includes('c')
  const hasNamed =
    headers.some(h => h.includes('t4t')) &&
    headers.some(h => h.includes('t4l')) &&
    headers.some(h => h.includes('t4c'))
  return hasPart && hasSt && (hasTlc || hasNamed)
}

function isT7Headers(headerRow: string[]): boolean {
  const headers = headerRow.map(normHeader)
  return (
    headers.some(h => h.includes('part_no')) &&
    headers.some(h => h.includes('t7_hl')) &&
    headers.some(h => h.includes('t7_bl'))
  )
}

function isT8Headers(headerRow: string[]): boolean {
  const headers = headerRow.map(normHeader)
  return headers.includes('part_number') && headers.includes('l7') && headers.includes('l5') && headers.includes('c7')
}

function isGdF10Headers(headerRow: string[], sheetName: string): boolean {
  if (/f10|k51|k50/i.test(sheetName) && /gd|ipl/i.test(sheetName)) return true
  return headerRow.map(normHeader).some(h => h.includes('f10') && h.includes('qty'))
}

function isGdF12Headers(headerRow: string[], sheetName: string): boolean {
  if (/f12/i.test(sheetName) && /gd|ipl/i.test(sheetName)) return true
  const headers = headerRow.map(normHeader)
  return (
    headers.includes('part_no') &&
    headers.some(h => h.includes('alternative_part_no1')) &&
    !headers.some(h => h.includes('f10') && h.includes('qty'))
  )
}

export function parseIplSheetRows(
  rows: string[][],
  sheetName: string,
  headerIdx?: number
): BomImportValidation | null {
  if (rows.length < 2) return null
  const headerRow = rows[headerIdx ?? 0] ?? rows[0]
  const match = IPL_PARSERS.find(p => p.test(headerRow, sheetName))
  return match ? match.parse(rows, headerIdx) : null
}

export function isIplMasterWorkbook(sheetNames: string[]): boolean {
  return sheetNames.filter(s => /^ipl[-_\s]/i.test(s.trim())).length >= 2
}

export type IplSheetSummary = {
  sheetName: string
  rowCount: number
  skipped: boolean
  skipReason?: string
}

export type WorkbookIplValidation = {
  sheets: IplSheetSummary[]
  validation: BomImportValidation
}

export function mergeBomImportValidations(parts: BomImportValidation[]): BomImportValidation {
  const rows: ParsedBomRow[] = []
  const errors: BomImportValidation['errors'] = []
  const warnings: BomImportValidation['warnings'] = []
  const stats = { ...EMPTY_STATS }

  for (const v of parts) {
    rows.push(...v.rows)
    errors.push(...v.errors)
    warnings.push(...v.warnings)
    stats.total += v.stats.total
    stats.missingPartNumber += v.stats.missingPartNumber
    stats.duplicateKeys += v.stats.duplicateKeys
    stats.needsReview += v.stats.needsReview
    stats.sourceRows += v.stats.sourceRows ?? 0
    stats.skippedNoQty += v.stats.skippedNoQty ?? 0
  }

  return { rows, errors, warnings, stats }
}
