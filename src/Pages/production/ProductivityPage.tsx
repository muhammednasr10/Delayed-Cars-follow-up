import { AlertOctagon, CalendarDays } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ProductionProductivityTab } from '../../Components/production/ProductionProductivityTab'
import { ProductionStopsTab } from '../../Components/production/ProductionStopsTab'
import type { ProductivityTab } from '../../Types/navigation'

export function ProductivityPage() {
  const { t } = useLang()
  const { productivityTab: tab, setProductivityTab: setTab } = useNavigation()
  const { canViewTab, loading: permsLoading } = useCanViewPage()

  const allTabs: { key: ProductivityTab; label: string; icon: typeof CalendarDays }[] = [
    { key: 'productivity', label: t('productivity.tabs.productivity'), icon: CalendarDays },
    { key: 'stops', label: t('productivity.tabs.stops'), icon: AlertOctagon }
  ]

  const tabs = allTabs.filter(item => permsLoading || canViewTab('production_productivity', item.key))

  const activeTab = tabs.some(item => item.key === tab) ? tab : (tabs[0]?.key ?? 'productivity')

  return (
    <PageTabShell
      title={t('productivity.title')}
      subtitle={t('productivity.subtitle')}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={activeTab}
      onTabChange={setTab}
    >
      {activeTab === 'productivity' && <ProductionProductivityTab />}
      {activeTab === 'stops' && <ProductionStopsTab />}
    </PageTabShell>
  )
}
