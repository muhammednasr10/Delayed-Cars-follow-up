import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type {
  BomTab,
  DepartmentId,
  EngineeringPage,
  LineBalancingTab,
  ProductionArea,
  ProductionPage,
  ProductionPlanTab,
  ProductivityTab,
  ProductivitySubTab,
  SettingsTab,
  TrainingTab,
  WarehousesTab,
  WarehousesFeedingSubTab,
  QualityTab,
  WorkerProfileTab
} from '../Types/navigation'
import type { ProfileTab } from '../Types/profile'

type NavState = {
  department: DepartmentId
  productionArea: ProductionArea
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
  productivitySubTab: ProductivitySubTab
  productivityStopFormOpen: boolean
  productionPlanTab: ProductionPlanTab
  warehousesTab: WarehousesTab
  warehousesFeedingSubTab: WarehousesFeedingSubTab
  qualityTab: QualityTab
  workerProfileTab: WorkerProfileTab
  sidebarOpen: boolean
}

type NavigatePatch = Partial<
  Pick<
    NavState,
    | 'department'
    | 'productionArea'
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
    | 'productivitySubTab'
    | 'productivityStopFormOpen'
    | 'productionPlanTab'
    | 'warehousesTab'
    | 'warehousesFeedingSubTab'
    | 'qualityTab'
    | 'workerProfileTab'
  >
> & { closeSidebar?: boolean }

type NavigationContextValue = NavState & {
  selectDepartment: (department: DepartmentId, keepSidebarOpen?: boolean) => void
  setProductionArea: (area: ProductionArea) => void
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
  setProductivitySubTab: (tab: ProductivitySubTab) => void
  setProductivityStopFormOpen: (open: boolean) => void
  setProductionPlanTab: (tab: ProductionPlanTab) => void
  setWarehousesTab: (tab: WarehousesTab) => void
  setWarehousesFeedingSubTab: (tab: WarehousesFeedingSubTab) => void
  setQualityTab: (tab: QualityTab) => void
  setWorkerProfileTab: (tab: WorkerProfileTab) => void
  setSidebarOpen: (open: boolean) => void
  navigate: (patch: NavigatePatch) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

const initialState: NavState = {
  department: 'production',
  productionArea: 'assembly',
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
  productivitySubTab: 'daily',
  productivityStopFormOpen: false,
  productionPlanTab: 'planOrders',
  warehousesTab: 'home',
  warehousesFeedingSubTab: 'plan',
  qualityTab: 'record',
  workerProfileTab: 'data',
  sidebarOpen: false
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavState>(initialState)

  const navigate = useCallback((patch: NavigatePatch) => {
    setState(prev => {
      const leavesGlobalHome =
        patch.department != null ||
        patch.productionArea != null ||
        patch.productionPage != null ||
        patch.engineeringPage != null ||
        patch.warehousesTab != null ||
        patch.qualityTab != null
      return {
        ...prev,
        ...patch,
        showProfile:
          patch.showProfile ??
          (patch.productionArea != null || patch.productionPage != null || patch.engineeringPage != null || patch.department != null
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
      const leavingSettings = department === 'production' && prev.productionPage === 'settings'
      return {
        ...prev,
        department,
        showProfile: false,
        showGlobalHome: false,
        ...(department === 'production' && (changed || (leavingSettings && !keepSidebarOpen))
          ? { productionArea: 'assembly' as const, productionPage: 'home' as const }
          : {}),
        ...(changed && department === 'engineering' ? { engineeringPage: 'home' as const } : {}),
        ...(changed && department === 'warehouses' ? { warehousesTab: 'home' as const } : {}),
        ...(changed && department === 'quality' ? { qualityTab: 'record' as const } : {}),
        sidebarOpen: keepSidebarOpen ? prev.sidebarOpen : false
      }
    })
  }, [])

  const value = useMemo<NavigationContextValue>(
    () => ({
      ...state,
      selectDepartment,
      setProductionArea: area => navigate({ productionArea: area, showProfile: false, closeSidebar: false }),
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
      setProductivitySubTab: productivitySubTab => setState(prev => ({ ...prev, productivitySubTab })),
      setProductivityStopFormOpen: productivityStopFormOpen => setState(prev => ({ ...prev, productivityStopFormOpen })),
      setProductionPlanTab: productionPlanTab => setState(prev => ({ ...prev, productionPlanTab })),
      setWarehousesTab: warehousesTab => setState(prev => ({ ...prev, warehousesTab })),
      setWarehousesFeedingSubTab: warehousesFeedingSubTab => setState(prev => ({ ...prev, warehousesFeedingSubTab })),
      setQualityTab: qualityTab => setState(prev => ({ ...prev, qualityTab })),
      setWorkerProfileTab: workerProfileTab => setState(prev => ({ ...prev, workerProfileTab })),
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
