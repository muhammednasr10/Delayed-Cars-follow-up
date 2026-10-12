import { useState } from 'react'
import { DepartmentHub } from '../../Components/DepartmentHub'
import { ReportMissingPartModal } from '../../Components/ReportMissingPartModal'
import { useLineAreaDailyHubSections } from '../../hooks/useLineAreaDailyHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function PaintHomePage() {
  const { t } = useLang()
  const [refreshKey, setRefreshKey] = useState(0)
  const { sections, reportOpen, setReportOpen } = useLineAreaDailyHubSections('paint', refreshKey)

  return (
    <section className="space-y-6">
      <DepartmentHub title={t('hub.paint.title')} subtitle={t('hub.paint.subtitle')} sections={sections} />
      <ReportMissingPartModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onReported={() => setRefreshKey(key => key + 1)}
      />
    </section>
  )
}
