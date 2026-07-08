import { useNavigation } from '../../../Context/NavigationContext'
import { WarehouseRacksTab } from './WarehouseRacksTab'
import { WarehouseCartsTab } from './WarehouseCartsTab'
import type { Warehouse } from '../../../Types/warehouse'
import type { Station } from '../../../Types/settings'

type Props = {
  warehouses: Warehouse[]
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

export function WarehouseEquipmentTab({ warehouses, stations, canManage, notify }: Props) {
  const nav = useNavigation()
  const subTab = nav.warehousesEquipmentSubTab

  if (subTab === 'carts') {
    return <WarehouseCartsTab warehouses={warehouses} canManage={canManage} notify={notify} />
  }

  return <WarehouseRacksTab warehouses={warehouses} stations={stations} canManage={canManage} notify={notify} />
}
