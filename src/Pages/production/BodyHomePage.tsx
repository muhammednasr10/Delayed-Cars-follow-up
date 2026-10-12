import { DepartmentHub } from '../../Components/DepartmentHub'
import { useBodyDailyHubSections } from '../../hooks/useBodyDailyHubSections'
import { useLang } from '../../i18n/LanguageContext'

export function BodyHomePage() {
  const { t } = useLang()
  const { sections } = useBodyDailyHubSections()

  return (
    <DepartmentHub title={t('hub.body.title')} subtitle={t('hub.body.subtitle')} sections={sections} />
  )
}
