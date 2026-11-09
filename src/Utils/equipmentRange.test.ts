import { describe, expect, it } from 'vitest'
import {
  computeActualOperatingRange,
  formatRangeBounds,
  parseRangeBoundsText
} from './equipmentRange'

describe('equipmentRange', () => {
  it('formats theoretical bounds', () => {
    expect(formatRangeBounds(20, 50)).toBe('20–50')
    expect(formatRangeBounds(null, null)).toBe('')
  })

  it('parses common range text', () => {
    expect(parseRangeBoundsText('20–50')).toEqual({ min: 20, max: 50 })
    expect(parseRangeBoundsText('5-14 Nm')).toEqual({ min: 5, max: 14 })
  })

  it('computes actual range from efficiency', () => {
    expect(computeActualOperatingRange(20, 50, 90)).toBe('18–45')
    expect(computeActualOperatingRange(20, 50, 100)).toBe('20–50')
    expect(computeActualOperatingRange(20, 50, null)).toBe('')
  })
})
