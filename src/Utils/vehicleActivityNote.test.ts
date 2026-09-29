import { describe, expect, it } from 'vitest'
import {
  formatActivityStamp,
  formatChassisNote,
  formatShortageEditNote,
  formatShortageFollowUpNote,
  formatShortageReportNote,
  presentActivityNote,
  withActivityWhen
} from './vehicleActivityNote'

describe('formatShortageReportNote', () => {
  it('logs the shortage without user notes', () => {
    expect(formatShortageReportNote(['مفتاح'])).toBe('تم تبليغ نقص جديد على السيارة.\nالسبب: «مفتاح»')
  })

  it('appends user notes so they appear in the vehicle thread', () => {
    expect(formatShortageReportNote(['مفتاح'], '  لازم توصل بكرة  ')).toBe(
      'تم تبليغ نقص جديد على السيارة.\nالسبب: «مفتاح»\nملاحظة مع التبليغ: لازم توصل بكرة'
    )
  })

  it('ignores blank user notes', () => {
    expect(formatShortageReportNote(['مفتاح'], '   ')).toBe('تم تبليغ نقص جديد على السيارة.\nالسبب: «مفتاح»')
  })

  it('includes notes even when listing several parts', () => {
    expect(formatShortageReportNote(['A', 'B'], 'عاجل')).toBe(
      'تم تبليغ 2 نواقص جديدة على السيارة.\nالأسباب: «A»، «B»\nملاحظة مع التبليغ: عاجل'
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
    expect(formatShortageEditNote('مفتاح', ['اتضافت ملاحظة: لازم توصل بكرة'])).toBe(
      'تم تعديل النقص «مفتاح».\nاتضافت ملاحظة: لازم توصل بكرة'
    )
  })
})

describe('activity note wording', () => {
  it('says who follows the shortage and skips empty assignments', () => {
    expect(
      formatShortageFollowUpNote({
        partLabels: ['صوت نقره بالمحرك'],
        completingDepartmentLabel: 'تغذية CKD',
        followUpEmployeeLabel: 'محمد'
      })
    ).toBe(
      'تم تسجيل متابعة على النقص «صوت نقره بالمحرك».\nالقسم اللي هيكمل النقص: تغذية CKD.\nالموظف المسؤول عن المتابعة: محمد.'
    )
    expect(formatShortageFollowUpNote({ partLabels: ['مفتاح'] })).toBe('تم إلغاء متابعة النقص «مفتاح».')
  })

  it('writes a chassis note that belongs to one VIN', () => {
    expect(formatChassisNote('6936', '  وصلت القطعة  ')).toBe('ملاحظة على الشاسيه 6936:\nوصلت القطعة')
    expect(formatChassisNote('6936', '  ')).toBe('اتمسحت ملاحظة الشاسيه 6936.')
  })

  it('hides the stamp and empty follow-up phrases when showing an older note', () => {
    expect(
      presentActivityNote('متابعة النقص لـ «مفتاح» — بدون قسم متمم — بدون موظف متابعة.\n27/09/2026 11:59')
    ).toBe('متابعة النقص لـ «مفتاح».')
    expect(presentActivityNote('تصنيف السبب stock_shortage ← qc_rejection')).toBe(
      'تصنيف السبب نقص مخزون إلى رفض جودة'
    )
  })
})
