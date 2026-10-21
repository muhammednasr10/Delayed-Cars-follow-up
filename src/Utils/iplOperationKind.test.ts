import { describe, expect, it } from 'vitest'
import { iplOperationKindFromName, iplOperationName, iplPartNameFromOperation, iplPartNumberFromOperation } from './iplOperationKind'

describe('ipl operation kind', () => {
  it('builds the operation name from the verb and the part', () => {
    expect(iplOperationName('تركيب', 'أكر')).toBe('تركيب أكر')
    expect(iplOperationName('', 'أكر')).toBe('أكر')
  })

  it('reads the verb back from the operation name', () => {
    expect(iplOperationKindFromName('فرد سقف')).toBe('فرد')
    expect(iplOperationKindFromName('تعزيم خرطوم')).toBe('تعزيم')
    expect(iplOperationKindFromName('أكر')).toBe('')
  })

  it('reads the part name without the verb or the split number', () => {
    expect(iplPartNameFromOperation('تركيب الروف راك شمال')).toBe('الروف راك شمال')
    expect(iplPartNameFromOperation('فرد خرطوم · 60-T8')).toBe('خرطوم')
    expect(iplPartNameFromOperation('أكر')).toBe('أكر')
  })

  it('keeps a different part number beside the part name', () => {
    expect(iplPartNumberFromOperation('تركيب خرطوم · 60-T8')).toBe('60-T8')
    expect(iplPartNumberFromOperation('تركيب خرطوم')).toBe('')
  })
})
