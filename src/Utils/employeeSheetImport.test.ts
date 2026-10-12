import { describe, expect, it } from 'vitest'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { resolveFactoryOrgUnitId } from './importWorkplaceMatch'
import { buildEmployeeImportPreview } from './employeeSheetImport'

function unit(id: string, name: string, parentId: string | null): FactoryOrgUnit {
  return {
    id,
    name,
    parentId,
    unitKind: parentId ? 'section' : 'administration',
    sortOrder: 0,
    isActive: true
  }
}

const org: FactoryOrgUnit[] = [
  unit('prod', 'الإنتاج', null),
  unit('body', 'البودي', 'prod'),
  unit('weld', 'اللحام', 'body'),
  unit('panel', 'السمكرة', 'body'),
  unit('paint', 'الدهان', 'prod')
]

describe('resolveFactoryOrgUnitId', () => {
  it('matches welding and panel beating under body', () => {
    expect(resolveFactoryOrgUnitId('اللحام', org)).toBe('weld')
    expect(resolveFactoryOrgUnitId('السمكرة', org)).toBe('panel')
    expect(resolveFactoryOrgUnitId('البودى', org)).toBe('body')
    expect(resolveFactoryOrgUnitId('البودي / اللحام', org)).toBe('weld')
  })
})

describe('buildEmployeeImportPreview', () => {
  it('accepts a body subsection that is not a settings work area', () => {
    const [row] = buildEmployeeImportPreview(
      [
        {
          'الرقم الوظيفي': '100',
          الاسم: 'عامل لحام',
          الوظيفة: 'فني',
          'حالة التعيين': 'متعين',
          'مكان العمل': 'اللحام'
        }
      ],
      [],
      new Set(),
      org
    )
    expect(row.errors).toEqual([])
    expect(row.factoryOrgUnitId).toBe('weld')
    expect(row.workAreaId).toBeNull()
  })
})
