import { useState } from 'react'
import { ListTodo, Trophy, UserCircle, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { MissionsBoardTab } from '../../Components/missions/MissionsBoardTab'
import { MissionsMyTab } from '../../Components/missions/MissionsMyTab'
import { MissionsLeaderboardTab } from '../../Components/missions/MissionsLeaderboardTab'

type MissionTab = 'board' | 'my' | 'leaderboard'

export function MissionsPage() {
  const { t } = useLang()
  const [tab, setTab] = useState<MissionTab>('my')
  const [leaderboardKey, setLeaderboardKey] = useState(0)

  const tabs: { key: MissionTab; label: string; icon: typeof Users }[] = [
    { key: 'my', label: t('missions.tabs.my'), icon: UserCircle },
    { key: 'board', label: t('missions.tabs.board'), icon: Users },
    { key: 'leaderboard', label: t('missions.tabs.leaderboard'), icon: Trophy }
  ]

  return (
    <PageTabShell
      title={t('missions.title')}
      subtitle={t('missions.subtitle')}
      icon={<ListTodo className="h-6 w-6" />}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={tab}
      onTabChange={setTab}
      activeClassName="bg-amber-500 text-slate-950"
    >
      {tab === 'my' && <MissionsMyTab onChanged={() => setLeaderboardKey(k => k + 1)} />}
      {tab === 'board' && <MissionsBoardTab onChanged={() => setLeaderboardKey(k => k + 1)} />}
      {tab === 'leaderboard' && <MissionsLeaderboardTab key={leaderboardKey} />}
    </PageTabShell>
  )
}
