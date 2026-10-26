import { describe, expect, it } from 'vitest'
import {
  parseQualityNoteFishbone,
  qualityNoteFishboneHasCauses,
  serializeQualityNoteFishbone
} from './qualityNoteFishbone'

describe('qualityNoteFishbone', () => {
  it('round-trips causes and drops empty text', () => {
    const raw = serializeQualityNoteFishbone({
      v: 1,
      causes: {
        man: ['تدريب ناقص', ''],
        machine: [],
        method: ['تسلسل خطأ'],
        material: [],
        measurement: [],
        environment: []
      }
    })
    const parsed = parseQualityNoteFishbone(raw)
    expect(parsed.causes.man).toEqual(['تدريب ناقص'])
    expect(parsed.causes.method).toEqual(['تسلسل خطأ'])
    expect(qualityNoteFishboneHasCauses(parsed)).toBe(true)
  })

  it('keeps legacy free-text on the method bone', () => {
    const parsed = parseQualityNoteFishbone('مسمار مقطوع من المورد')
    expect(parsed.causes.method).toEqual(['مسمار مقطوع من المورد'])
    expect(qualityNoteFishboneHasCauses(parsed)).toBe(true)
  })

  it('serializes empty diagrams to an empty string', () => {
    expect(
      serializeQualityNoteFishbone({
        v: 1,
        causes: { man: ['  '], machine: [], method: [], material: [], measurement: [], environment: [] }
      })
    ).toBe('')
  })
})
