import { describe, expect, it } from 'vitest'
import { formatActivityStamp, formatShortageEditNote, formatShortageReportNote, withActivityWhen } from './vehicleActivityNote'

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

describe('withActivityWhen', () => {
  it('appends the edit date and time for the notes thread', () => {
    const when = new Date(2026, 8, 27, 11, 59)
    expect(formatActivityStamp(when)).toBe('27/09/2026 11:59')
    expect(withActivityWhen('تعديل نقص «مفتاح».', when)).toBe('تعديل نقص «مفتاح».\n27/09/2026 11:59')
  })
})

describe('formatShortageEditNote', () => {
  it('includes the new notes text when notes change', () => {
    expect(formatShortageEditNote('مفتاح', ['الملاحظات: لازم توصل بكرة'])).toBe(
      'تعديل نقص «مفتاح»: الملاحظات: لازم توصل بكرة.'
    )
  })
})
