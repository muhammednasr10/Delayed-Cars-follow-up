import { DepartmentHub } from '../../Components/DepartmentHub'
import { useProductionOverviewHubSections } from '../../hooks/useProductionOverviewHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function ProductionOverviewPage() {
  const { t } = useLang()
  const { sections } = useProductionOverviewHubSections()

  return (
    <DepartmentHub
      title={t('hub.production.title')}
      subtitle={t('hub.production.areasSubtitle')}
      sections={sections}
    />
  )
}
