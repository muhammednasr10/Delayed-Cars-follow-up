import { Factory } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { ProductionArea } from '../../Types/navigation'

type Props = {
  area: ProductionArea
}

export function ProductionAreaPlaceholderPage({ area }: Props) {
  const { t } = useLang()

  return (
    <section className="card-industrial flex min-h-[min(60vh,32rem)] flex-col items-center justify-center gap-4 p-8 text-center sm:p-12">
      <div className="rounded-3xl bg-slate-800/80 p-5 text-cyan-300">
        <Factory className="h-12 w-12" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('departments.production')}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{t(`departments.productionArea.${area}`)}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{t('departments.productionAreaPlaceholder')}</p>
      </div>
    </section>
  )
}
