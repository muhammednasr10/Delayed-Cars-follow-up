import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_IPL_OPERATION_KIND,
  iplOperationKindFromName,
  iplOperationName,
  iplPartNameFromOperation,
  iplPartNumberFromOperation,
  listedIplOperationKinds,
  saveCustomIplOperationKind
} from './iplOperationKind'

const CUSTOM_KINDS_KEY = 'afa.iplCustomOperationKinds'

afterEach(() => {
  localStorage.removeItem(CUSTOM_KINDS_KEY)
})

describe('ipl operation kind', () => {
  it('builds the operation name from the verb and the part', () => {
    expect(iplOperationName('تركيب', 'أكر')).toBe('تركيب أكر')
    expect(iplOperationName('', 'أكر')).toBe('أكر')
  })

  it('reads the verb back from the operation name', () => {
    expect(iplOperationKindFromName('فرد سقف')).toBe('فرد')
    expect(iplOperationKindFromName('تعزيم خرطوم')).toBe('تعزيم')
    expect(iplOperationKindFromName('أكر')).toBe('')
    expect(iplOperationKindFromName('لحام كلبس', ['لحام'])).toBe('لحام')
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

  it('defaults the listed kinds with تركيب first', () => {
    expect(listedIplOperationKinds()[0]).toBe(DEFAULT_IPL_OPERATION_KIND)
  })

  it('saves a custom kind and lists it on later cards', () => {
    expect(saveCustomIplOperationKind(' لحام ')).toBe('لحام')
    expect(listedIplOperationKinds()).toContain('لحام')
    expect(saveCustomIplOperationKind('تركيب')).toBe('تركيب')
  })
})
