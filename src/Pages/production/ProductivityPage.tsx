import { useNavigation } from '../../Context/NavigationContext'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { ProductionProductivityTab } from '../../Components/production/ProductionProductivityTab'
import { ProductionStopsTab } from '../../Components/production/ProductionStopsTab'
import type { ProductivityTab } from '../../Types/navigation'

export function ProductivityPage() {
  const { productivityTab: tab } = useNavigation()
  const { canViewTab, loading: permsLoading } = useCanViewPage()

  const allTabs: { key: ProductivityTab }[] = [
    { key: 'productivity' },
    { key: 'stops' }
  ]

  const tabs = allTabs.filter(item => permsLoading || canViewTab('production_productivity', item.key))

  const activeTab = tabs.some(item => item.key === tab) ? tab : (tabs[0]?.key ?? 'productivity')

  return (
    <section className="space-y-4">
      {activeTab === 'productivity' && <ProductionProductivityTab />}
      {activeTab === 'stops' && <ProductionStopsTab />}
    </section>
  )
}
