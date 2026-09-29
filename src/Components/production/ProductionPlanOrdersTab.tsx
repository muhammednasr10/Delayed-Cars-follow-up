import { useProductionPlanOrders } from '../../hooks/useProductionPlanOrders'
import { ProductionOrdersPanel } from './ProductionOrdersPanel'
import { ProductionPlanView } from './ProductionPlanView'

type Props = {
  view: 'plan' | 'orders'
}

export function ProductionPlanOrdersTab({ view }: Props) {
  const h = useProductionPlanOrders(view)

  return (
    <section className="space-y-6">
      {view === 'plan' && <ProductionPlanView h={h} />}
      {view === 'orders' && <ProductionOrdersPanel h={h} />}
    </section>
  )
}
