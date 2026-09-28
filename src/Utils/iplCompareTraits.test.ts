import { describe, expect, it } from 'vitest'
import {
  addCompareTrait,
  normalizeTraitsForSave,
  parseCompareTraits,
  removeCompareTrait,
  setCompareTraitValue,
  traitCompareStatus
} from './iplCompareTraits'

describe('ipl compare traits', () => {
  it('parses stored traits and drops blank names', () => {
    expect(
      parseCompareTraits([
        { id: 'a', name: 'حجم', values: { 'T4 L': 'كبير' } },
        { id: 'b', name: '  ', values: {} },
        null
      ])
    ).toEqual([{ id: 'a', name: 'حجم', values: { 'T4 L': 'كبير' } }])
  })

  it('adds a trait once and ignores duplicates', () => {
    const first = addCompareTrait([], 'لون')
    const second = addCompareTrait(first, ' لون ')
    expect(second).toHaveLength(1)
    expect(second[0].name).toBe('لون')
  })

  it('marks matching values as same and mixed values as different', () => {
    const models = ['T4 L', 'T4 C']
    const same = setCompareTraitValue(
      setCompareTraitValue(addCompareTrait([], 'شكل'), 'unused', 'T4 L', 'دائري'),
      'unused',
      'T4 C',
      'دائري'
    )
    const trait = same[0]
    expect(traitCompareStatus({ ...trait, values: { 'T4 L': 'دائري', 'T4 C': 'دائري' } }, models)).toBe('same')
    expect(traitCompareStatus({ ...trait, values: { 'T4 L': 'دائري', 'T4 C': 'مربع' } }, models)).toBe('different')
    expect(traitCompareStatus({ ...trait, values: { 'T4 L': 'دائري' } }, models)).toBe('different')
    expect(traitCompareStatus({ ...trait, values: {} }, models)).toBe('empty')
  })

  it('removes a trait and trims values before save', () => {
    const traits = addCompareTrait(addCompareTrait([], 'حجم'), 'شكل')
    expect(removeCompareTrait(traits, traits[0].id)).toHaveLength(1)
    const saved = normalizeTraitsForSave([
      { id: '1', name: '  لون  ', values: { 'T4 L': '  أحمر ' } },
      { id: '2', name: 'لون', values: { 'T4 L': 'أزرق' } },
      { id: '3', name: '   ', values: {} }
    ])
    expect(saved).toEqual([{ id: '1', name: 'لون', values: { 'T4 L': 'أحمر' } }])
  })
})
