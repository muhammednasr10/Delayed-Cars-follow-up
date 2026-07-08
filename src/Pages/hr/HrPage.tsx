import { useState } from 'react'
import { UserMinus, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { OrgStructurePage, type RosterMode } from '../shared/OrgStructurePage'

/** الموارد البشرية — السجل الرئيسي لكل العمالة. */
export function HrPage() {
  const { t } = useLang()
  const [rosterTab, setRosterTab] = useState<RosterMode>('current')

  const tabs = [
    { key: 'current' as const, label: t('org.tabs.current'), icon: <Users className="h-4 w-4" /> },
    { key: 'former' as const, label: t('org.tabs.former'), icon: <UserMinus className="h-4 w-4" /> }
  ]

  return (
    <PageTabShell
      title={t('org.title')}
      subtitle={t('org.hrSubtitle')}
      icon={<Users className="h-6 w-6" />}
      tabs={tabs}
      activeTab={rosterTab}
      onTabChange={setRosterTab}
    >
      <OrgStructurePage embedded workforceScope="all" rosterMode={rosterTab} />
    </PageTabShell>
  )
}
