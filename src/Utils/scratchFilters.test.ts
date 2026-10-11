import { describe, expect, it } from 'vitest'
import {
  EMPTY_SCRATCH_FILTER,
  scratchAreaLeaf,
  scratchMatchesFilter,
  splitScratchDefect,
  type ScratchListFilter
} from './scratchFilters'
import type { ScratchRecord } from '../Types/scratch'

const row: ScratchRecord = {
  id: '1',
  vin: '2988',
  parentModelName: 'T4-PRO',
  modelName: 'T4-PRO C',
  bodyArea: 'الإنتاج / التجميع / الفاينال',
  severity: 'light',
  recordedAt: '2026-10-01',
  notes: 'خدش اكصدام امامي',
  willStop: false,
  completingDepartment: null,
  followUpEmployeeId: null,
  followUpEmployeeName: null,
  followUpEmployeeIds: [],
  followUpEmployeeNames: null,
  resolvedAt: null
}

const labels = { severity: 'خفيف', willStop: 'هتمشي' }

function match(patch: Partial<ScratchListFilter>) {
  return scratchMatchesFilter(row, { ...EMPTY_SCRATCH_FILTER, ...patch }, labels)
}

describe('scratchAreaLeaf', () => {
  it('keeps only the last recorded subsection', () => {
    expect(scratchAreaLeaf('الإنتاج / التجميع / الشاسيه و الفانيلات / الفانيلات')).toBe('الفانيلات')
    expect(scratchAreaLeaf('الإنتاج / التجميع / تريم أ / تريم أ')).toBe('تريم أ')
    expect(scratchAreaLeaf('')).toBe('')
  })
})

describe('splitScratchDefect', () => {
  it('splits the defect from its location', () => {
    expect(splitScratchDefect('خدش اوكرة باب خلفي يمين')).toEqual({
      defect: 'خدش',
      location: 'اوكرة باب خلفي يمين',
      action: ''
    })
    expect(splitScratchDefect('خدش في اكصدام خلفي')).toEqual({ defect: 'خدش', location: 'اكصدام خلفي', action: '' })
    expect(splitScratchDefect('لقوة باب خلفي يمين')).toEqual({ defect: 'لقوة', location: 'باب خلفي يمين', action: '' })
    expect(splitScratchDefect('سمكرة ارضية الشنطة')).toEqual({ defect: 'سمكرة', location: 'ارضية الشنطة', action: '' })
    expect(splitScratchDefect('كسيل دهان قائم امامي يمين')).toEqual({
      defect: 'كسيل دهان',
      location: 'قائم امامي يمين',
      action: ''
    })
    expect(splitScratchDefect('خدش')).toEqual({ defect: 'خدش', location: '', action: '' })
    expect(splitScratchDefect('خدش\u001fاكصدام خلفي\u001fتم الصنفرة')).toEqual({
      defect: 'خدش',
      location: 'اكصدام خلفي',
      action: 'تم الصنفرة'
    })
  })
})

describe('scratchMatchesFilter', () => {
  it('matches every search word across chassis, model, and notes', () => {
    expect(match({ search: '2988 اكصدام' })).toBe(true)
    expect(match({ search: 't4 خفيف' })).toBe(true)
    expect(match({ search: '5661' })).toBe(false)
  })

  it('applies the dropdown filters with the search', () => {
    expect(match({ parent: 'T4-PRO', severity: 'light', willStop: 'no' })).toBe(true)
    expect(match({ willStop: 'yes' })).toBe(false)
    expect(match({ variant: 'T7-PRO L' })).toBe(false)
  })
})
