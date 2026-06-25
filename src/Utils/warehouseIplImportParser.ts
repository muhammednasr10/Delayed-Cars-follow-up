import type { BomImportValidation, ParsedBomRow } from '../Types/bom'
import type { VehicleModel } from '../Types/settings'
import { parseBomSpreadsheetRows } from './bomImportParser'
import { isAssignableModel } from './vehicleModelHierarchy'

const SKIP_SHEET = /^(readme|summary|cover|index|instructions|ملخص|تعليمات|فهرس)$/i

export type IplSheetSummary = {
  sheetName: string
  modelHint: string | null
  rowCount: number
  skipped: boolean
  skipReason?: string
}

export type WorkbookIplValidation = {
  sheets: IplSheetSummary[]
  validation: BomImportValidation
}

export function inferModelNameFromSheetName(sheetName: string, modelNames: string[]): string | null {
  let s = sheetName.trim().replace(/^ipl[-_\s]*/i, '').trim()
  if (!s || /^t4$/i.test(s) || /ipl.*t4/i.test(sheetName)) return null

  const upper = s.toUpperCase()
  const exact = modelNames.find(n => n.toUpperCase() === upper)
  if (exact) return exact

  const compact = upper.replace(/[\s_-]+/g, '')
  return modelNames.find(n => n.toUpperCase().replace(/[\s_-]+/g, '') === compact) ?? null
}

function rowHasModelAssignment(row: ParsedBomRow): boolean {
  if (row.applicableModels.length > 0) return true
  return row.qtyByModel.some(q => q.model.trim())
}

function applySheetModelHint(
  validation: BomImportValidation,
  sheetName: string,
  modelName: string | null
): BomImportValidation {
  if (!modelName) return validation

  const rows = validation.rows.map(row => {
    if (rowHasModelAssignment(row)) {
      return { ...row, sourceSheet: row.sourceSheet || sheetName }
    }
    return {
      ...row,
      modelFamily: row.modelFamily || modelName.replace(/[A-Z0-9]+$/i, '').trim() || row.modelFamily,
      applicableModels: [modelName],
      qtyByModel: row.qtyByModel.map(q => ({ model: modelName, qty: q.qty })),
      sourceSheet: sheetName
    }
  })

  return { ...validation, rows }
}

function shouldSkipSheet(sheetName: string, rows: string[][]): string | null {
  if (SKIP_SHEET.test(sheetName.trim())) return 'meta'
  if (rows.length < 2) return 'empty'
  if (!rows.some(r => r.some(c => String(c).trim()))) return 'empty'
  return null
}

function mergeValidations(parts: BomImportValidation[]): BomImportValidation {
  const rows: ParsedBomRow[] = []
  const errors: BomImportValidation['errors'] = []
  const warnings: BomImportValidation['warnings'] = []
  const stats = {
    total: 0,
    missingPartNumber: 0,
    duplicateKeys: 0,
    needsReview: 0,
    sourceRows: 0,
    skippedNoQty: 0
  }

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

export function parseWorkbookIplSheets(
  sheets: { sheetName: string; rows: string[][] }[],
  models: VehicleModel[]
): WorkbookIplValidation {
  const modelNames = models.filter(m => m.is_active && isAssignableModel(m)).map(m => m.name)
  const sheetSummaries: IplSheetSummary[] = []
  const validations: BomImportValidation[] = []

  for (const { sheetName, rows } of sheets) {
    const skip = shouldSkipSheet(sheetName, rows)
    if (skip) {
      sheetSummaries.push({ sheetName, modelHint: null, rowCount: 0, skipped: true, skipReason: skip })
      continue
    }

    const modelHint = inferModelNameFromSheetName(sheetName, modelNames)
    const parsed = applySheetModelHint(parseBomSpreadsheetRows(rows, sheetName), sheetName, modelHint)

    if (parsed.rows.length === 0) {
      sheetSummaries.push({
        sheetName,
        modelHint,
        rowCount: 0,
        skipped: true,
        skipReason: 'no_rows'
      })
      continue
    }

    validations.push(parsed)
    sheetSummaries.push({
      sheetName,
      modelHint,
      rowCount: parsed.rows.length,
      skipped: false
    })
  }

  return {
    sheets: sheetSummaries,
    validation: mergeValidations(validations)
  }
}
