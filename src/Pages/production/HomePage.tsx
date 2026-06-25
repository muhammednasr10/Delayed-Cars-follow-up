import { useState } from 'react'
import { DepartmentHub } from '../../Components/DepartmentHub'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { ProductionDashboard } from '../../Components/home/ProductionDashboard'
import { useProductionHubSections } from '../../hooks/useProductionHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function HomePage() {
  const { t } = useLang()
  const { sections, reportOpen, setReportOpen } = useProductionHubSections()
  const [deptRefreshKey, setDeptRefreshKey] = useState(0)

  return (
    <section className="space-y-6">
      <DepartmentHub title={t('hub.production.title')} subtitle={t('hub.production.subtitle')} sections={sections} />
      <ProductionDashboard deptRefreshKey={deptRefreshKey} />
      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setDeptRefreshKey(k => k + 1)}
      />
    </section>
  )
}
