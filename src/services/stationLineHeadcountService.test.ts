import { describe, expect, it } from 'vitest'
import { resolveStationHeadcountDisplay } from './stationLineHeadcountService'
import type { ModelLine } from '../Utils/modelLines'

function byLine(rows: Array<[ModelLine, number]>): Map<ModelLine, number> {
  return new Map(rows)
}

describe('resolveStationHeadcountDisplay', () => {
  it('shows one number when a single line is selected', () => {
    expect(
      resolveStationHeadcountDisplay(byLine([['T4', 4], ['T8', 6]]), ['T4'], 6)
    ).toEqual({ mode: 'single', count: 4 })
  })

  it('shows one number when every selected line has the same count', () => {
    expect(
      resolveStationHeadcountDisplay(byLine([['T4', 4], ['T8', 4]]), ['T4', 'T8'], 4)
    ).toEqual({ mode: 'single', count: 4 })
  })

  it('splits counts when selected lines differ and all-models filter is open', () => {
    expect(
      resolveStationHeadcountDisplay(byLine([['T4', 4], ['T8', 6]]), ['T4', 'T8'], 6)
    ).toEqual({
      mode: 'split',
      entries: [
        { line: 'T4', count: 4 },
        { line: 'T8', count: 6 }
      ]
    })
  })

  it('uses fallback for a line with no stored headcount', () => {
    expect(
      resolveStationHeadcountDisplay(byLine([['T4', 4]]), ['T4', 'T8'], 6)
    ).toEqual({
      mode: 'split',
      entries: [
        { line: 'T4', count: 4 },
        { line: 'T8', count: 6 }
      ]
    })
  })
})
