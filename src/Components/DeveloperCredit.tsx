import { Phone, User } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

type Variant = 'footer' | 'inline' | 'card'

type Props = {
  variant?: Variant
  className?: string
}

export function DeveloperCredit({ variant = 'footer', className = '' }: Props) {
  const { t } = useLang()
  const phone = t('developer.phone')
  const phoneHref = `tel:${t('developer.phoneRaw')}`

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${className}`}>
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-300">
          <User className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          {t('developer.name')}
        </span>
        <span className="text-slate-500">{t('developer.title')}</span>
        <a href={phoneHref} dir="ltr" className="inline-flex items-center gap-1 font-mono text-cyan-300 hover:text-cyan-200">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {phone}
        </a>
      </div>
    )
  }

  const boxCls =
    variant === 'card'
      ? 'rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3 text-center'
      : ''

  return (
    <div className={`space-y-1 text-xs ${boxCls} ${className}`}>
      <p className="flex items-center justify-center gap-1.5 font-black text-slate-200 sm:justify-start">
        <User className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
        {t('developer.name')}
      </p>
      <p className="text-slate-500">{t('developer.title')}</p>
      <a
        href={phoneHref}
        dir="ltr"
        className="inline-flex items-center justify-center gap-1 font-mono font-bold text-cyan-300 hover:text-cyan-200 sm:justify-start"
      >
        <Phone className="h-3.5 w-3.5 shrink-0" />
        {phone}
      </a>
    </div>
  )
}
