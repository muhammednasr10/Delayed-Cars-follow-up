/** Tailwind CSS-variable wiring. Keep names in sync with palettes.ts. */

export const COLOR_SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

export const PALETTE_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose'
]

export function tailwindRgbPalettes() {
  return Object.fromEntries(
    PALETTE_NAMES.map(name => [
      name,
      Object.fromEntries(COLOR_SCALE.map(step => [step, `rgb(var(--c-${name}-${step}) / <alpha-value>)`]))
    ])
  )
}
