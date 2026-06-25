import { AlertOctagon, CalendarDays, ClipboardList, LogIn, LogOut } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ProductionPlanWorkDaysTab } from '../../Components/ProductionPlanWorkDaysTab'
import { ProductionStopsTab } from '../../Components/production/ProductionStopsTab'
import { EntryProductivityPage } from './EntryProductivityPage'
import { ExitProductivityPage } from './ExitProductivityPage'
import { ProductionOrdersPage } from './ProductionOrdersPage'
import type { ProductivityTab } from '../../Types/navigation'

export function ProductivityPage() {
  const { t } = useLang()
  const { productivityTab: tab, setProductivityTab: setTab } = useNavigation()

  const tabs: { key: ProductivityTab; label: string; icon: typeof LogIn }[] = [
    { key: 'orders', label: t('productivity.tabs.orders'), icon: ClipboardList },
    { key: 'entry', label: t('productivity.tabs.entry'), icon: LogIn },
    { key: 'exit', label: t('productivity.tabs.exit'), icon: LogOut },
    { key: 'stops', label: t('productivity.tabs.stops'), icon: AlertOctagon },
    { key: 'workDays', label: t('productionOrders.tabs.workDays'), icon: CalendarDays }
  ]

  return (
    <PageTabShell
      title={t('productivity.title')}
      subtitle={t('productivity.subtitle')}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === 'orders' && <ProductionOrdersPage />}
      {tab === 'entry' && <EntryProductivityPage />}
      {tab === 'exit' && <ExitProductivityPage />}
      {tab === 'stops' && <ProductionStopsTab />}
      {tab === 'workDays' && <ProductionPlanWorkDaysTab />}
    </PageTabShell>
  )
}
