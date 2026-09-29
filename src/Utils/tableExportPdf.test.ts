import { describe, expect, it } from 'vitest'
import { rowPageBreaks } from './tableExportPdf'

describe('rowPageBreaks', () => {
  it('moves the break to the start of a row instead of cutting through it', () => {
    const breaks = rowPageBreaks([0, 40, 90], [40, 50, 30], 100, 120)
    expect(breaks).toEqual([0, 90, 120])
  })

  it('keeps a short table on one page', () => {
    expect(rowPageBreaks([0, 20], [20, 20], 100, 40)).toEqual([0, 40])
  })
})
