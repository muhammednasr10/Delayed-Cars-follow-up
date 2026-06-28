import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type {
  BomTab,
  DepartmentId,
  EngineeringPage,
  LineBalancingTab,
  ProductionPage,
  ProductionPlanTab,
  ProductivityTab,
  SettingsTab,
  TrainingTab,
  WarehousesTab,
  WarehousesFeedingSubTab
} from '../Types/navigation'
import type { ProfileTab } from '../Types/profile'

type NavState = {
  department: DepartmentId
  productionPage: ProductionPage
  engineeringPage: EngineeringPage
  showProfile: boolean
  profileTab: ProfileTab
  showGlobalHome: boolean
  bomTab: BomTab
  lineBalancingTab: LineBalancingTab
  trainingTab: TrainingTab
  settingsTab: SettingsTab
  productivityTab: ProductivityTab
  productionPlanTab: ProductionPlanTab
  warehousesTab: WarehousesTab
  warehousesFeedingSubTab: WarehousesFeedingSubTab
  sidebarOpen: boolean
}

type NavigatePatch = Partial<
  Pick<
    NavState,
    | 'department'
    | 'productionPage'
    | 'engineeringPage'
    | 'showProfile'
    | 'profileTab'
    | 'showGlobalHome'
    | 'bomTab'
    | 'lineBalancingTab'
    | 'trainingTab'
    | 'settingsTab'
    | 'productivityTab'
    | 'productionPlanTab'
    | 'warehousesTab'
    | 'warehousesFeedingSubTab'
  >
> & { closeSidebar?: boolean }

type NavigationContextValue = NavState & {
  selectDepartment: (department: DepartmentId, keepSidebarOpen?: boolean) => void
  setProductionPage: (page: ProductionPage) => void
  setEngineeringPage: (page: EngineeringPage) => void
  openProfile: (tab?: ProfileTab) => void
  closeProfile: () => void
  openGlobalHome: () => void
  setBomTab: (tab: BomTab) => void
  setLineBalancingTab: (tab: LineBalancingTab) => void
  setTrainingTab: (tab: TrainingTab) => void
  setSettingsTab: (tab: SettingsTab) => void
  setProductivityTab: (tab: ProductivityTab) => void
  setProductionPlanTab: (tab: ProductionPlanTab) => void
  setWarehousesTab: (tab: WarehousesTab) => void
  setWarehousesFeedingSubTab: (tab: WarehousesFeedingSubTab) => void
  setSidebarOpen: (open: boolean) => void
  navigate: (patch: NavigatePatch) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

const initialState: NavState = {
  department: 'production',
  productionPage: 'home',
  engineeringPage: 'home',
  showProfile: false,
  profileTab: 'account',
  showGlobalHome: true,
  bomTab: 'parts',
  lineBalancingTab: 'operations',
  trainingTab: 'org',
  settingsTab: 'administrations',
  productivityTab: 'orders',
  productionPlanTab: 'planOrders',
  warehousesTab: 'home',
  warehousesFeedingSubTab: 'plan',
  sidebarOpen: false
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavState>(initialState)

  const navigate = useCallback((patch: NavigatePatch) => {
    setState(prev => {
      const leavesGlobalHome =
        patch.department != null ||
        patch.productionPage != null ||
        patch.engineeringPage != null ||
        patch.warehousesTab != null
      return {
        ...prev,
        ...patch,
        showProfile:
          patch.showProfile ??
          (patch.productionPage != null || patch.engineeringPage != null || patch.department != null
            ? false
            : prev.showProfile),
        showGlobalHome:
          patch.showGlobalHome ??
          (patch.showProfile === true || leavesGlobalHome ? false : prev.showGlobalHome),
        sidebarOpen: patch.closeSidebar === false ? prev.sidebarOpen : patch.closeSidebar === true ? false : prev.sidebarOpen
      }
    })
  }, [])

  const selectDepartment = useCallback((department: DepartmentId, keepSidebarOpen = false) => {
    setState(prev => {
      const changed = prev.department !== department
      return {
        ...prev,
        department,
        showProfile: false,
        showGlobalHome: false,
        ...(changed && department === 'production' ? { productionPage: 'home' as const } : {}),
        ...(changed && department === 'engineering' ? { engineeringPage: 'home' as const } : {}),
        ...(changed && department === 'warehouses' ? { warehousesTab: 'home' as const } : {}),
        sidebarOpen: keepSidebarOpen ? prev.sidebarOpen : false
      }
    })
  }, [])

  const value = useMemo<NavigationContextValue>(
    () => ({
      ...state,
      selectDepartment,
      setProductionPage: page => navigate({ productionPage: page, showProfile: false, closeSidebar: false }),
      setEngineeringPage: page => navigate({ engineeringPage: page, showProfile: false, closeSidebar: false }),
      openProfile: (tab = 'account') =>
        setState(prev => ({ ...prev, showProfile: true, profileTab: tab, showGlobalHome: false, sidebarOpen: false })),
      closeProfile: () => setState(prev => ({ ...prev, showProfile: false, profileTab: 'account' })),
      openGlobalHome: () => setState(prev => ({ ...prev, showGlobalHome: true, showProfile: false, sidebarOpen: false })),
      setBomTab: bomTab => setState(prev => ({ ...prev, bomTab })),
      setLineBalancingTab: lineBalancingTab => setState(prev => ({ ...prev, lineBalancingTab })),
      setTrainingTab: trainingTab => setState(prev => ({ ...prev, trainingTab })),
      setSettingsTab: settingsTab => setState(prev => ({ ...prev, settingsTab })),
      setProductivityTab: productivityTab => setState(prev => ({ ...prev, productivityTab })),
      setProductionPlanTab: productionPlanTab => setState(prev => ({ ...prev, productionPlanTab })),
      setWarehousesTab: warehousesTab => setState(prev => ({ ...prev, warehousesTab })),
      setWarehousesFeedingSubTab: warehousesFeedingSubTab => setState(prev => ({ ...prev, warehousesFeedingSubTab })),
      setSidebarOpen: sidebarOpen => setState(prev => ({ ...prev, sidebarOpen })),
      navigate
    }),
    [navigate, selectDepartment, state]
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider')
  return ctx
}
