import { describe, expect, it } from 'vitest'
import { PALETTE_NAMES, PALETTE_RGB, sourceStep } from './palettes'
import { themeCssText } from './applyTheme'

describe('sourceStep', () => {
  it('keeps dark-mode steps unchanged', () => {
    expect(sourceStep('cyan', 300, 'dark')).toBe(300)
    expect(sourceStep('slate', 950, 'dark')).toBe(950)
  })

  it('inverts the scale in light mode and keeps accent 500', () => {
    expect(sourceStep('cyan', 300, 'light')).toBe(700)
    expect(sourceStep('cyan', 500, 'light')).toBe(500)
    expect(sourceStep('slate', 950, 'light')).toBe(50)
  })

  it('darkens muted slate-500 text in light mode', () => {
    expect(sourceStep('slate', 500, 'light')).toBe(600)
  })
})

describe('PALETTE_RGB', () => {
  it('covers every named palette', () => {
    expect(Object.keys(PALETTE_RGB).sort()).toEqual([...PALETTE_NAMES].sort())
  })
})

describe('themeCssText', () => {
  it('emits inverted slate-950 for light surfaces', () => {
    expect(themeCssText('light')).toContain('--c-slate-950:248 250 252')
    expect(themeCssText('dark')).toContain('--c-slate-950:2 6 23')
  })
})
