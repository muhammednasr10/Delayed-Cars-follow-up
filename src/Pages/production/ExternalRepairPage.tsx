import { useEffect, useMemo, useState } from 'react'
import { Factory, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import { TrainingMatrixPage } from './TrainingMatrixPage'
import { externalRepairSections } from '../../Utils/productionAreaCounts'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'

/** الإصلاح الخارجي: أقسام من الهيكل + تبويب العمالة بكل تبويباته. */
export function ExternalRepairPage() {
  const { t } = useLang()
  const { externalRepairSectionId, trainingTab, navigate } = useNavigation()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getFactoryOrgUnits()
      .then(units => {
        if (!cancelled) setOrgUnits(units)
      })
      .catch(() => {
        if (!cancelled) setOrgUnits([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sections = useMemo(() => externalRepairSections(orgUnits), [orgUnits])
  const activeSection = sections.find(s => s.id === externalRepairSectionId) ?? sections[0] ?? null

  useEffect(() => {
    if (loading) return
    if (sections.length === 0) {
      if (externalRepairSectionId != null) {
        navigate({ externalRepairSectionId: null, productionPage: 'home' })
      }
      return
    }
    if (!externalRepairSectionId || !sections.some(s => s.id === externalRepairSectionId)) {
      navigate({
        productionArea: 'externalRepair',
        productionPage: 'training',
        externalRepairSectionId: sections[0].id,
        trainingTab: trainingTab || 'org'
      })
    }
  }, [loading, sections, externalRepairSectionId, trainingTab, navigate])

  if (loading) {
    return (
      <section className="card-industrial p-8 text-center text-sm text-slate-400">{t('common.loading')}</section>
    )
  }

  if (sections.length === 0) {
    return (
      <section className="card-industrial flex min-h-[min(50vh,28rem)] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-3xl bg-slate-800/80 p-5 text-cyan-300">
          <Factory className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{t('departments.productionArea.externalRepair')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{t('externalRepair.noSections')}</p>
        </div>
      </section>
    )
  }

  if (!activeSection) return null

  return (
    <div className="space-y-4">
      <section className="card-industrial flex items-start gap-3 p-4 sm:p-5">
        <div className="rounded-xl bg-sky-500/15 p-3 text-sky-300">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {t('departments.productionArea.externalRepair')}
          </p>
          <h2 className="text-lg font-black text-white">{activeSection.name}</h2>
          <p className="text-sm text-slate-400">{t('externalRepair.sectionHint')}</p>
        </div>
      </section>
      <TrainingMatrixPage workforceOrgUnitId={activeSection.id} workforceLabel={activeSection.name} />
    </div>
  )
}
