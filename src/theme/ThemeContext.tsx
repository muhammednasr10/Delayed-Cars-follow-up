// @refresh reset
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyAppTheme, persistTheme, readStoredTheme, type AppTheme } from './applyTheme'

export type { AppTheme }
export { THEME_STORAGE_KEY, applyAppTheme, readStoredTheme } from './applyTheme'

type ThemeContextValue = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function initialTheme(): AppTheme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : readStoredTheme()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme)

  useEffect(() => {
    applyAppTheme(theme)
    persistTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: AppTheme) => setThemeState(next), [])
  const toggle = useCallback(() => setThemeState(prev => (prev === 'light' ? 'dark' : 'light')), [])
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
