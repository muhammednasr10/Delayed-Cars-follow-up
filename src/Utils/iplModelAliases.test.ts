import { describe, expect, it } from 'vitest'
import { iplModelNamesMatch, resolveIplModelName, t4IplVariantKey, preferredIplModelName } from './iplModelAliases'

describe('iplModelAliases', () => {
  it('treats T4T as T4-PRO T', () => {
    expect(t4IplVariantKey('T4T')).toBe('T4T')
    expect(t4IplVariantKey('T4-PRO T')).toBe('T4T')
    expect(iplModelNamesMatch('T4T', 'T4-PRO T')).toBe(true)
    expect(iplModelNamesMatch('T4L', 'T4-PRO  L')).toBe(true)
    expect(iplModelNamesMatch('T4C', 'T4-PRO C')).toBe(true)
    expect(iplModelNamesMatch('T4T', 'T4-PRO L')).toBe(false)
    expect(iplModelNamesMatch('T4T', 'T4-PRO')).toBe(false)
  })

  it('resolves import codes to catalog names', () => {
    const catalog = ['T4-PRO', 'T4-PRO T', 'T4-PRO  L', 'T4-PRO C']
    expect(resolveIplModelName('T4T', catalog)).toBe('T4-PRO T')
    expect(resolveIplModelName('T4L', catalog)).toBe('T4-PRO  L')
    expect(resolveIplModelName('T4C', catalog)).toBe('T4-PRO C')
  })

  it('prefers T4-PRO T as the default IPL tab', () => {
    expect(preferredIplModelName(['T4-PRO C', 'T4-PRO T', 'T7H'])).toBe('T4-PRO T')
  })
})
