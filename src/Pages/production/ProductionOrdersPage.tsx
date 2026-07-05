import { useEffect } from 'react'
import { useNavigation } from '../../Context/NavigationContext'

/** ترحيل: أوامر الإنتاج انتقلت لقسم التخطيط */
export function ProductionOrdersPage() {
  const nav = useNavigation()

  useEffect(() => {
    nav.navigate({ department: 'planning', planningTab: 'orders', showGlobalHome: false })
  }, [nav])

  return null
}
