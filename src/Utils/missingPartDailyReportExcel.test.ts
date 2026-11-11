import { describe, expect, it } from 'vitest'
import type { MissingPartDetail } from '../Types/missingPart'
import type { VehicleModel } from '../Types/settings'
import {
  buildDailyDetailSheetRows,
  buildDailyShortageExcelSheets,
  buildFamilyCountSummaryBlock,
  formatDailyReportDate,
  summarizeCausingDepartments
} from './missingPartDailyReportExcel'

function line(partial: Partial<MissingPartDetail> & Pick<MissingPartDetail, 'id' | 'vehicleId' | 'vin'>): MissingPartDetail {
  return {
    partDescription: 'جزء',
    requiredQty: 1,
    installedQty: 0,
    remainingQty: 1,
    reason: 'stock_shortage',
    department: 'warehouse',
    completingDepartment: null,
    followUpEmployeeId: null,
    followUpEmployeeName: null,
    followUpEmployeeIds: [],
    followUpEmployeeNames: null,
    priority: 'normal',
    status: 'open',
    qcApproved: false,
    isDrItem: false,
    stopperType: 'car_stopper',
    notes: null,
    modelName: 'T7-PRO L',
    colorName: 'أبيض',
    colorCode: '11U',
    colorHex: null,
    stationNumber: null,
    stationName: null,
    stationLineName: null,
    stationArea: null,
    stationDepartment: null,
    stationPerson: null,
    createdBy: null,
    createdByName: null,
    createdByEmail: null,
    createdAt: '2026-10-26T10:00:00Z',
    updatedAt: '2026-10-26T10:00:00Z',
    shortageResolvedAt: null,
    shortageResolvedByName: null,
    transferredAt: null,
    pendingTransferRequestId: null,
    pendingRestoreRequestId: null,
    reportGroupId: null,
    stationId: null,
    factoryOrgUnitId: null,
    ...partial
  }
}

const models: VehicleModel[] = [
  {
    id: 'fam-t7',
    name: 'T7-PRO',
    model_kind: 'family',
    parent_model_id: null,
    parent_company: null,
    agency: null,
    is_active: true
  },
  {
    id: 'var-t7',
    name: 'T7-PRO L',
    model_kind: 'variant',
    parent_model_id: 'fam-t7',
    parent_company: null,
    agency: null,
    is_active: true
  },
  {
    id: 'fam-gd',
    name: 'GD',
    model_kind: 'family',
    parent_model_id: null,
    parent_company: null,
    agency: null,
    is_active: true
  }
]

describe('summarizeCausingDepartments', () => {
  it('counts a vehicle once per department and keeps each shortage line', () => {
    const summary = summarizeCausingDepartments([
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'الدهان' },
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'الدهان' },
      { vehicleId: 'a', modelName: 'T4-PRO', department: 'التجميع' },
      { vehicleId: 'b', modelName: 'GD', department: 'الدهان' }
    ])

    expect(summary.byDepartment).toEqual([
      { department: 'الدهان', vehicles: 2, lines: 3 },
      { department: 'التجميع', vehicles: 1, lines: 1 }
    ])
    expect(summary.byModel).toEqual([
      { model: 'T4-PRO', department: 'الدهان', vehicles: 1, lines: 2 },
      { model: 'GD', department: 'الدهان', vehicles: 1, lines: 1 },
      { model: 'T4-PRO', department: 'التجميع', vehicles: 1, lines: 1 }
    ])
  })
})

describe('daily shortage excel layout', () => {
  it('formats the activity day as DD/MM/YYYY', () => {
    expect(formatDailyReportDate('2026-10-26')).toBe('26/10/2026')
  })

  it('builds a family count block with Total first', () => {
    const block = buildFamilyCountSummaryBlock(
      [
        line({ id: '1', vehicleId: 'v1', vin: '5118', modelName: 'T7-PRO L' }),
        line({ id: '2', vehicleId: 'v2', vin: '5119', modelName: 'T7-PRO L' }),
        line({ id: '3', vehicleId: 'v3', vin: '5120', modelName: 'GD' })
      ],
      models,
      '2026-10-26',
      'ملخص السيارات الحالية بتاريخ',
      'Total'
    )
    expect(block[0]).toEqual(['26/10/2026', 'ملخص السيارات الحالية بتاريخ'])
    expect(block[1]?.[0]).toBe('Total')
    expect(block[1]).toContain('GD')
    expect(block[1]).toContain('T7-PRO')
    expect(block[2]?.[0]).toBe(3)
  })

  it('exports detail rows in reference column order', () => {
    const rows = buildDailyDetailSheetRows(
      [line({ id: '1', vehicleId: 'v1', vin: '5118', partDescription: 'مسامير زوايا مفقودة' })],
      {
        vin: 'رقم الشاسيه',
        model: 'الموديل',
        color: 'اللون',
        reason: 'السبب',
        causingDepartment: 'القسم المتسبب',
        reasonClass: 'تصنيف السبب'
      },
      () => 'نقص مخزون',
      () => 'مخزن CKD'
    )
    expect(rows[0]).toEqual([
      'رقم الشاسيه',
      'الموديل',
      'اللون',
      'السبب',
      'القسم المتسبب',
      'تصنيف السبب'
    ])
    expect(rows[1]?.[0]).toBe('5118')
    expect(rows[1]?.[3]).toBe('مسامير زوايا مفقودة')
    expect(rows[1]?.[4]).toBe('مخزن CKD')
    expect(rows[1]?.[5]).toBe('نقص مخزون')
  })

  it('builds four sheets matching the reference workbook tabs', () => {
    const sheets = buildDailyShortageExcelSheets({
      dayKey: '2026-10-26',
      models,
      newItems: [line({ id: '1', vehicleId: 'v1', vin: '1001' })],
      completedItems: [line({ id: '2', vehicleId: 'v2', vin: '1002', modelName: 'GD' })],
      currentItems: [
        line({ id: '3', vehicleId: 'v3', vin: '1003' }),
        line({ id: '4', vehicleId: 'v4', vin: '1004', modelName: 'GD' })
      ],
      sheetNames: {
        summary: 'ملخص',
        new: 'نواقص جديدة',
        completed: 'سيارات مستكملة',
        current: 'السيارات الحالية'
      },
      summaryLabels: {
        completedTitle: 'ملخص السيارات المستكملة بتاريخ',
        newTitle: 'ملخص السيارات النواقص الجديدة بتاريخ',
        currentTitle: 'ملخص السيارات الحالية بتاريخ',
        total: 'Total'
      },
      detailLabels: {
        vin: 'رقم الشاسيه',
        model: 'الموديل',
        color: 'اللون',
        reason: 'السبب',
        causingDepartment: 'القسم المتسبب',
        reasonClass: 'تصنيف السبب'
      },
      reasonLabel: code => code,
      departmentLabel: code => code
    })

    expect(sheets.map(s => s.name)).toEqual([
      'ملخص',
      'نواقص جديدة',
      'سيارات مستكملة',
      'السيارات الحالية'
    ])
    expect(sheets[0]?.rows[0]?.[0]).toBe('26/10/2026')
    expect(sheets[0]?.headerRows).toEqual([0, 1, 5, 6, 10, 11])
    expect(sheets[3]?.rows[0]?.[0]).toBe('رقم الشاسيه')
    expect(sheets[3]?.rows.length).toBe(3)
  })
})
