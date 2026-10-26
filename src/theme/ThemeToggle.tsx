import { Moon, Sun } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useTheme } from './ThemeContext'

const HEADER_BTN = 'touch-target rounded-xl bg-slate-800 p-2.5 text-slate-200 hover:bg-slate-700'
const COMPACT_BTN = 'rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const { t } = useLang()
  const light = theme === 'light'
  const label = light ? t('theme.toDark') : t('theme.toLight')

  return (
    <button type="button" onClick={toggle} className={compact ? COMPACT_BTN : HEADER_BTN} title={label} aria-label={label}>
      {light ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  )
}
