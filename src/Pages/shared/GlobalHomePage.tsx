import { useState } from 'react'
import { DepartmentHub } from '../../Components/DepartmentHub'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { useGlobalHubSections } from '../../hooks/useGlobalHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function GlobalHomePage() {
  const { t } = useLang()
  const [deptRefreshKey, setDeptRefreshKey] = useState(0)
  const { sections, reportOpen, setReportOpen } = useGlobalHubSections(deptRefreshKey)

  return (
    <section className="space-y-6">
      <DepartmentHub title={t('hub.global.title')} subtitle={t('hub.global.subtitle')} sections={sections} />
      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setDeptRefreshKey(k => k + 1)}
      />
    </section>
  )
}
