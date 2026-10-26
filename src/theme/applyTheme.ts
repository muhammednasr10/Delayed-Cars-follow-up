import { COLOR_SCALE, PALETTE_NAMES, PALETTE_RGB, sourceStep } from './palettes'

export type AppTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'afa.theme'
export const THEME_VARS_STYLE_ID = 'afa-theme-vars'

const THEME_COLOR: Record<AppTheme, string> = {
  dark: '#020617',
  light: '#f1f5f9'
}

export function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function persistTheme(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore quota / private mode */
  }
}

export function themeCssText(theme: AppTheme): string {
  const decls = [
    `--c-white:${theme === 'light' ? '15 23 42' : '255 255 255'}`,
    '--c-black:0 0 0'
  ]
  for (const name of PALETTE_NAMES) {
    for (const step of COLOR_SCALE) {
      decls.push(`--c-${name}-${step}:${PALETTE_RGB[name][sourceStep(name, step, theme)]}`)
    }
  }
  return `:root{${decls.join(';')}}`
}

export function applyAppTheme(theme: AppTheme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme

  let style = document.getElementById(THEME_VARS_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = THEME_VARS_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = themeCssText(theme)

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}
