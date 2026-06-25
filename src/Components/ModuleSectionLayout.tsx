import type { LucideIcon } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

type Props = {
  icon: LucideIcon
  titleKey: string
  subtitleKey: string
  accentClass?: string
}

export function ModuleSectionLayout({
  icon: Icon,
  titleKey,
  subtitleKey,
  accentClass = 'text-cyan-300 bg-cyan-500/15'
}: Props) {
  const { t } = useLang()

  return (
    <section className="card-industrial p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className={`rounded-xl p-3 ${accentClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{t(titleKey)}</h2>
          <p className="text-sm text-slate-400">{t(subtitleKey)}</p>
        </div>
      </div>
      <div className="flex min-h-[min(40vh,20rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
        <p className="text-sm text-slate-500">{t('departments.placeholderDesc')}</p>
      </div>
    </section>
  )
}
