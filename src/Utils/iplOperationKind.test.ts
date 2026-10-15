import { describe, expect, it } from 'vitest'
import { iplOperationKindFromName, iplOperationName } from './iplOperationKind'

describe('ipl operation kind', () => {
  it('builds the operation name from the verb and the part', () => {
    expect(iplOperationName('تركيب', 'أكر')).toBe('تركيب أكر')
    expect(iplOperationName('', 'أكر')).toBe('أكر')
  })

  it('reads the verb back from the operation name', () => {
    expect(iplOperationKindFromName('فرد سقف')).toBe('فرد')
    expect(iplOperationKindFromName('أكر')).toBe('')
  })
})
