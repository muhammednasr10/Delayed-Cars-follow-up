import { useState } from 'react'
import { DepartmentHub } from '../../Components/DepartmentHub'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { useAssemblyDailyHubSections } from '../../hooks/useAssemblyDailyHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function HomePage() {
  const { t } = useLang()
  const [deptRefreshKey, setDeptRefreshKey] = useState(0)
  const { sections, reportOpen, setReportOpen } = useAssemblyDailyHubSections(deptRefreshKey)

  return (
    <section className="space-y-6">
      <DepartmentHub title={t('hub.assembly.title')} subtitle={t('hub.assembly.subtitle')} sections={sections} />
      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setDeptRefreshKey(k => k + 1)}
      />
    </section>
  )
}
