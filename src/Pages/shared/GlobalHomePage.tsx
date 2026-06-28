import { useState } from 'react'
import { DepartmentHub } from '../../Components/DepartmentHub'
import { ProductionDashboard } from '../../Components/home/ProductionDashboard'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { useGlobalHubSections } from '../../hooks/useGlobalHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function GlobalHomePage() {
  const { t } = useLang()
  const { sections, reportOpen, setReportOpen } = useGlobalHubSections()
  const [deptRefreshKey, setDeptRefreshKey] = useState(0)

  return (
    <section className="space-y-6">
      <DepartmentHub title={t('hub.global.title')} subtitle={t('hub.global.subtitle')} sections={sections} />
      <ProductionDashboard deptRefreshKey={deptRefreshKey} />
      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setDeptRefreshKey(k => k + 1)}
      />
    </section>
  )
}
