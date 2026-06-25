import { ArrowRight } from 'lucide-react'
import { DEPARTMENTS } from '../config/departments'
import { useLang } from '../i18n/LanguageContext'
import type { DepartmentId } from '../Types/navigation'

type Props = {
  department: DepartmentId
  onOpenProduction?: () => void
}

export function DepartmentPlaceholderPage({ department, onOpenProduction }: Props) {
  const { t, dir } = useLang()
  const config = DEPARTMENTS.find(d => d.id === department)
  const Icon = config?.icon

  return (
    <section className="card-industrial flex min-h-[min(60vh,32rem)] flex-col items-center justify-center gap-4 p-8 text-center sm:p-12">
      {Icon && (
        <div className="rounded-3xl bg-slate-800/80 p-5 text-cyan-300">
          <Icon className="h-12 w-12" />
        </div>
      )}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{t('departments.sectionLabel')}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{t(`departments.${department}`)}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{t('departments.placeholderDesc')}</p>
      </div>
      {department !== 'production' && onOpenProduction && (
        <button
          type="button"
          onClick={onOpenProduction}
          className="mt-2 flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
        >
          {t('departments.goProduction')}
          <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}
