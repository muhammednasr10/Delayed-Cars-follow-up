import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations, type Lang } from './translations'

type Vars = Record<string, string | number>

type LanguageContextValue = {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (lang: Lang) => void
  toggle: () => void
  t: (key: string, vars?: Vars) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'app.lang'

function resolvePath(obj: unknown, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj) as string | undefined
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (vars[key] !== undefined ? String(vars[key]) : `{${key}}`))
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return stored === 'en' || stored === 'ar' ? stored : 'ar'
  })

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const toggle = useCallback(() => setLangState(prev => (prev === 'ar' ? 'en' : 'ar')), [])

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const value = resolvePath(translations[lang], key) ?? resolvePath(translations.ar, key)
      if (typeof value !== 'string') return key
      return interpolate(value, vars)
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, dir, setLang, toggle, t }), [lang, dir, setLang, toggle, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLang must be used inside LanguageProvider')
  return context
}
