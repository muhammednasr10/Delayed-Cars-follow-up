import { useState } from 'react'
import { Inbox, Send } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { RequestsMyTab } from '../../Components/requests/RequestsMyTab'
import { RequestsInboxTab } from '../../Components/requests/RequestsInboxTab'

type Tab = 'my' | 'inbox'

export function RequestsPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<Tab>('my')
  const [missionsKey, setMissionsKey] = useState(0)

  return (
    <PageTabShell
      title={t('requests.title')}
      subtitle={t('requests.subtitle')}
      icon={<Send className="h-6 w-6" />}
      tabs={[
        { key: 'my' as Tab, label: t('requests.tabs.my'), icon: <Send className="h-4 w-4" /> },
        { key: 'inbox' as Tab, label: t('requests.tabs.inbox'), icon: <Inbox className="h-4 w-4" /> }
      ]}
      activeTab={tab}
      onTabChange={setTab}
      activeClassName="bg-violet-500 text-white"
    >
      {tab === 'my' && <RequestsMyTab key={missionsKey} />}
      {tab === 'inbox' && <RequestsInboxTab onChanged={() => setMissionsKey(k => k + 1)} />}
    </PageTabShell>
  )
}
