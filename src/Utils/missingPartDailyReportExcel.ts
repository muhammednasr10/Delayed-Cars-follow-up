import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleModel } from '../Types/settings'
import type { ExcelSheet } from './tableExport'
import { buildFamilyVehicleCounts } from './missingPartPageUtils'
import { formatVehicleColorLabel } from './vehicleColorLabel'

export type CausingSummaryLine = {
  vehicleId: string
  modelName: string
  department: string
}

export type CausingDepartmentTotal = {
  department: string
  vehicles: number
  lines: number
}

export type CausingModelTotal = {
  model: string
  department: string
  vehicles: number
  lines: number
}

type Bucket = { vehicles: Set<string>; lines: number }

function bump(bucket: Bucket, vehicleId: string) {
  bucket.vehicles.add(vehicleId)
  bucket.lines += 1
}

export function summarizeCausingDepartments(lines: CausingSummaryLine[]): {
  byDepartment: CausingDepartmentTotal[]
  byModel: CausingModelTotal[]
} {
  const byDepartment = new Map<string, Bucket>()
  const byModel = new Map<string, Bucket & { model: string; department: string }>()

  for (const line of lines) {
    const department = line.department.trim() || '—'
    const model = line.modelName.trim() || '—'
    const deptBucket = byDepartment.get(department) ?? { vehicles: new Set<string>(), lines: 0 }
    bump(deptBucket, line.vehicleId)
    byDepartment.set(department, deptBucket)

    const modelKey = `${model}\u0000${department}`
    const modelBucket = byModel.get(modelKey) ?? { vehicles: new Set<string>(), lines: 0, model, department }
    bump(modelBucket, line.vehicleId)
    byModel.set(modelKey, modelBucket)
  }

  const byCount = (a: { vehicles: number; lines: number }, b: { vehicles: number; lines: number }, labelA: string, labelB: string) =>
    b.vehicles - a.vehicles || b.lines - a.lines || labelA.localeCompare(labelB, 'ar')

  return {
    byDepartment: [...byDepartment.entries()]
      .map(([department, bucket]) => ({ department, vehicles: bucket.vehicles.size, lines: bucket.lines }))
      .sort((a, b) => byCount(a, b, a.department, b.department)),
    byModel: [...byModel.values()]
      .map(bucket => ({
        model: bucket.model,
        department: bucket.department,
        vehicles: bucket.vehicles.size,
        lines: bucket.lines
      }))
      .sort((a, b) => byCount(a, b, `${a.model}${a.department}`, `${b.model}${b.department}`))
  }
}

/** DD/MM/YYYY to match the reference daily shortage workbook. */
export function formatDailyReportDate(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return dayKey
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

export type DailyReportFamilySummaryLabels = {
  completedTitle: string
  newTitle: string
  currentTitle: string
  total: string
}

export type DailyReportDetailLabels = {
  vin: string
  model: string
  color: string
  reason: string
  causingDepartment: string
  reasonClass: string
}

export type DailyReportSheetNames = {
  summary: string
  new: string
  completed: string
  current: string
}

/** One summary block: title row + family header + counts (Total first). */
export function buildFamilyCountSummaryBlock(
  items: MissingPartDetail[],
  models: VehicleModel[],
  dayKey: string,
  title: string,
  totalLabel: string
): Array<Array<string | number>> {
  const { total, byFamily } = buildFamilyVehicleCounts(items, models)
  const families = byFamily.map(row => row.familyName)
  const counts = byFamily.map(row => row.count)
  return [
    [formatDailyReportDate(dayKey), title],
    [totalLabel, ...families],
    [total, ...counts]
  ]
}

export function buildDailyDetailSheetRows(
  items: MissingPartDetail[],
  labels: DailyReportDetailLabels,
  reasonLabel: (code: string) => string,
  departmentLabel: (code: string) => string
): Array<Array<string | number>> {
  const sorted = [...items].sort(
    (a, b) =>
      a.vin.localeCompare(b.vin, undefined, { numeric: true }) ||
      a.modelName.localeCompare(b.modelName, 'ar') ||
      a.partDescription.localeCompare(b.partDescription, 'ar')
  )
  return [
    [
      labels.vin,
      labels.model,
      labels.color,
      labels.reason,
      labels.causingDepartment,
      labels.reasonClass
    ],
    ...sorted.map(item => [
      item.vin,
      item.modelName || '—',
      formatVehicleColorLabel(item.colorName, item.colorCode) || '—',
      item.partDescription.trim() || '—',
      departmentLabel(item.department),
      reasonLabel(item.reason)
    ])
  ]
}

export function buildDailyShortageExcelSheets(input: {
  dayKey: string
  models: VehicleModel[]
  newItems: MissingPartDetail[]
  completedItems: MissingPartDetail[]
  currentItems: MissingPartDetail[]
  sheetNames: DailyReportSheetNames
  summaryLabels: DailyReportFamilySummaryLabels
  detailLabels: DailyReportDetailLabels
  reasonLabel: (code: string) => string
  departmentLabel: (code: string) => string
}): ExcelSheet[] {
  const completedBlock = buildFamilyCountSummaryBlock(
    input.completedItems,
    input.models,
    input.dayKey,
    input.summaryLabels.completedTitle,
    input.summaryLabels.total
  )
  const newBlock = buildFamilyCountSummaryBlock(
    input.newItems,
    input.models,
    input.dayKey,
    input.summaryLabels.newTitle,
    input.summaryLabels.total
  )
  const currentBlock = buildFamilyCountSummaryBlock(
    input.currentItems,
    input.models,
    input.dayKey,
    input.summaryLabels.currentTitle,
    input.summaryLabels.total
  )

  const summaryRows: Array<Array<string | number>> = [
    ...completedBlock,
    [],
    [],
    ...newBlock,
    [],
    [],
    ...currentBlock
  ]

  // Title + column header for each of the three summary tables.
  const summaryHeaderRows = [0, 1, 5, 6, 10, 11]

  return [
    {
      name: input.sheetNames.summary,
      rows: summaryRows,
      headerRows: summaryHeaderRows
    },
    {
      name: input.sheetNames.new,
      rows: buildDailyDetailSheetRows(input.newItems, input.detailLabels, input.reasonLabel, input.departmentLabel)
    },
    {
      name: input.sheetNames.completed,
      rows: buildDailyDetailSheetRows(
        input.completedItems,
        input.detailLabels,
        input.reasonLabel,
        input.departmentLabel
      )
    },
    {
      name: input.sheetNames.current,
      rows: buildDailyDetailSheetRows(
        input.currentItems,
        input.detailLabels,
        input.reasonLabel,
        input.departmentLabel
      )
    }
  ]
}
