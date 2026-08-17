import { describe, expect, it } from 'vitest'
import type { MpDepartmentReasonLink, MpLookupOption } from '../Types/mpLookup'
import {
  ingestMpLookupOptions,
  isOpaqueLookupCode,
  mpLookupLabel,
  pickReasonForDepartment,
  reasonsForDepartment
} from './mpLookupLabel'

const reasons: MpLookupOption[] = [
  { id: '1', code: 'other', labelAr: 'أخرى', labelEn: 'Other', sortOrder: 1, isActive: true },
  { id: '2', code: 'stock_shortage', labelAr: 'نقص', labelEn: 'Stock', sortOrder: 2, isActive: true },
  { id: '3', code: 'qc_rejection', labelAr: 'جودة', labelEn: 'QC', sortOrder: 3, isActive: true },
  { id: '4', code: 'opt_1786943995064', labelAr: 'عيب دهان', labelEn: 'Paint defect', sortOrder: 4, isActive: true }
]

const links: MpDepartmentReasonLink[] = [
  { departmentCode: 'body', reasonCode: 'other', sortOrder: 0 },
  { departmentCode: 'body', reasonCode: 'qc_rejection', sortOrder: 1 }
]

describe('reasonsForDepartment', () => {
  it('returns all reasons when a department has no links', () => {
    expect(reasonsForDepartment(reasons, links, 'paint').map(r => r.code)).toEqual([
      'other',
      'stock_shortage',
      'qc_rejection',
      'opt_1786943995064'
    ])
  })

  it('filters to linked classes and keeps the current value', () => {
    expect(reasonsForDepartment(reasons, links, 'body').map(r => r.code)).toEqual(['other', 'qc_rejection'])
    expect(reasonsForDepartment(reasons, links, 'body', 'stock_shortage').map(r => r.code)).toEqual([
      'stock_shortage',
      'other',
      'qc_rejection'
    ])
  })
})

describe('pickReasonForDepartment', () => {
  it('keeps a valid class and otherwise picks the first linked class', () => {
    expect(pickReasonForDepartment(reasons, links, 'body', 'qc_rejection')).toBe('qc_rejection')
    expect(pickReasonForDepartment(reasons, links, 'body', 'stock_shortage')).toBe('other')
    expect(pickReasonForDepartment(reasons, [], 'body', 'missing')).toBe('other')
  })
})

describe('mpLookupLabel', () => {
  it('resolves labels and never returns opaque codes', () => {
    expect(mpLookupLabel(reasons, 'opt_1786943995064', 'ar')).toBe('عيب دهان')
    expect(mpLookupLabel(reasons, 'opt.1786943995064', 'ar')).toBe('عيب دهان')
    expect(isOpaqueLookupCode('opt_1786943995064')).toBe(true)
  })

  it('uses ingested cache when options are empty', () => {
    ingestMpLookupOptions(reasons)
    expect(mpLookupLabel([], 'opt_1786943995064', 'ar')).toBe('عيب دهان')
  })
})
