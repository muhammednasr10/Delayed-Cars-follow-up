import { describe, expect, it } from 'vitest'
import { formatShortageEditNote, formatShortageReportNote } from './vehicleActivityNote'

describe('formatShortageReportNote', () => {
  it('logs the shortage without user notes', () => {
    expect(formatShortageReportNote(['مفتاح'])).toBe('تبليغ نقص جديد: «مفتاح».')
  })

  it('appends user notes so they appear in the vehicle thread', () => {
    expect(formatShortageReportNote(['مفتاح'], '  لازم توصل بكرة  ')).toBe(
      'تبليغ نقص جديد: «مفتاح».\nملاحظات: لازم توصل بكرة'
    )
  })

  it('ignores blank user notes', () => {
    expect(formatShortageReportNote(['مفتاح'], '   ')).toBe('تبليغ نقص جديد: «مفتاح».')
  })

  it('includes notes even when listing several parts', () => {
    expect(formatShortageReportNote(['A', 'B'], 'عاجل')).toBe(
      'تبليغ نقص جديد (2): «A»، «B».\nملاحظات: عاجل'
    )
  })
})

describe('formatShortageEditNote', () => {
  it('includes the new notes text when notes change', () => {
    expect(formatShortageEditNote('مفتاح', ['الملاحظات: لازم توصل بكرة'])).toBe(
      'تعديل نقص «مفتاح»: الملاحظات: لازم توصل بكرة.'
    )
  })
})
