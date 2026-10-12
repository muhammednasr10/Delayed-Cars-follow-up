import { useNavigation } from '../Context/NavigationContext'
import type { ProductionArea } from '../Types/navigation'

export function useLineSection(): ProductionArea {
  const { productionArea } = useNavigation()
  if (
    productionArea === 'body' ||
    productionArea === 'paint' ||
    productionArea === 'assembly' ||
    productionArea === 'externalRepair'
  ) {
    return productionArea
  }
  return 'assembly'
}
