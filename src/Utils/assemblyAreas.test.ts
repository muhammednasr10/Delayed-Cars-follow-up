import { describe, expect, it } from 'vitest'
import type { JobRole } from '../Types/enums'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import { areasInName, productivityWriteScope } from './assemblyAreas'

function unit(id: string, name: string, parentId: string | null, kind: FactoryOrgUnit['unitKind']): FactoryOrgUnit {
  return { id, name, parentId, unitKind: kind, sortOrder: 0, isActive: true }
}

const units = [
  unit('prod', 'الإنتاج', null, 'administration'),
  unit('trim', 'تريم أ&ب', 'prod', 'section'),
  unit('trim-a', 'تريم أ', 'trim', 'subsection'),
  unit('trim-b', 'تريم ب', 'trim', 'subsection'),
  unit('line', 'شاسيه وفاينال', 'prod', 'section'),
  unit('chassis', 'شاسيه', 'line', 'subsection'),
  unit('final', 'فاينال', 'line', 'subsection')
]

function supervisor(orgId: string, role: JobRole = 'supervisor') {
  return { jobRole: role, factoryOrgUnitId: orgId, workAreaName: null }
}

describe('areasInName', () => {
  it('splits trim subsections and treats a combined parent as both', () => {
    expect(areasInName('تريم أ')).toEqual(new Set(['trim_a']))
    expect(areasInName('تريم ب')).toEqual(new Set(['trim_b']))
    expect(areasInName('تريم أ&ب')).toEqual(new Set(['trim_a', 'trim_b']))
    expect(areasInName('شاسيه')).toEqual(new Set(['chassis']))
    expect(areasInName('فاينال')).toEqual(new Set(['final']))
    expect(areasInName('شاسيه وفاينال')).toEqual(new Set(['chassis', 'final']))
  })
})

describe('productivityWriteScope', () => {
  it('lets the trim parent supervisor edit entry only', () => {
    expect(productivityWriteScope(supervisor('trim'), units, false)).toEqual({
      canEditEntry: true,
      canEditExit: false
    })
  })

  it('lets the chassis and final supervisor edit exit only', () => {
    expect(productivityWriteScope(supervisor('line'), units, false)).toEqual({
      canEditEntry: false,
      canEditExit: true
    })
  })

  it('keeps a subsection supervisor and an assistant on view only', () => {
    expect(productivityWriteScope(supervisor('trim-a'), units, false).canEditEntry).toBe(false)
    expect(productivityWriteScope(supervisor('trim-a', 'assistant_supervisor'), units, false)).toEqual({
      canEditEntry: false,
      canEditExit: false
    })
  })

  it('lets a system admin edit both lines', () => {
    expect(productivityWriteScope(null, units, true)).toEqual({ canEditEntry: true, canEditExit: true })
  })
})
