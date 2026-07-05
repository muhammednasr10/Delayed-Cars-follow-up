import { useEffect, useMemo } from 'react'
import { Activity, CalendarDays, ClipboardList, Target } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { ProductionPlanOrdersTab } from '../../Components/production/ProductionPlanOrdersTab'
import { ProductionPlanWorkDaysTab } from '../../Components/ProductionPlanWorkDaysTab'
import { PlanningDailyTrackingTab } from '../../Components/planning/PlanningDailyTrackingTab'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { pagePermForPlanning } from '../../config/pageAccess'
import type { PlanningTab } from '../../Types/navigation'

export function PlanningPage() {
  const { t } = useLang()
  const { planningTab: tab, setPlanningTab: setTab } = useNavigation()
  const { canViewPage, loading } = useCanViewPage()

  const tabs = useMemo(() => {
    const all: { key: PlanningTab; label: string; icon: typeof Target }[] = [
      { key: 'plan', label: t('productionOrders.title'), icon: Target },
      { key: 'workDays', label: t('productionOrders.tabs.workDays'), icon: CalendarDays },
      { key: 'tracking', label: t('planning.tracking.tab'), icon: Activity },
      { key: 'orders', label: t('productionOrders.ordersSection'), icon: ClipboardList }
    ]
    if (loading) return all
    return all.filter(item => canViewPage(pagePermForPlanning(item.key)))
  }, [canViewPage, loading, t])

  useEffect(() => {
    if (loading || tabs.length === 0) return
    if (!tabs.some(item => item.key === tab)) setTab(tabs[0].key)
  }, [loading, setTab, tab, tabs])

  const activeTab = tabs.some(item => item.key === tab) ? tab : tabs[0]?.key

  if (!activeTab) return null

  return (
    <PageTabShell
      title={t('departments.planning')}
      subtitle={t('planning.subtitle')}
      tabs={tabs.map(item => ({ key: item.key, label: item.label, icon: <item.icon className="h-4 w-4" /> }))}
      activeTab={activeTab}
      onTabChange={setTab}
      activeClassName="bg-violet-500 text-slate-950"
    >
      {activeTab === 'plan' && <ProductionPlanOrdersTab view="plan" />}
      {activeTab === 'workDays' && <ProductionPlanWorkDaysTab variant="workDays" />}
      {activeTab === 'tracking' && <PlanningDailyTrackingTab />}
      {activeTab === 'orders' && <ProductionPlanOrdersTab view="orders" />}
    </PageTabShell>
  )
}
