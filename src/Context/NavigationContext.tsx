import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  BomTab,
  DepartmentId,
  EngineeringPage,
  LineBalancingTab,
  PlanningTab,
  ProductionArea,
  ProductionPage,
  ProductivityTab,
  ProductivitySubTab,
  AttendanceSubTab,
  SettingsTab,
  TrainingTab,
  WarehousesTab,
  WarehousesFeedingSubTab,
  WarehousesEquipmentSubTab,
  QualityTab,
  WorkerProfileTab
} from '../Types/navigation'
import { normalizeBomTab } from '../Types/navigation'
import { PROFILE_TABS, profileTabFromWorkerTab, type ProfileTab } from '../Types/profile'

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
  attendanceSubTab: AttendanceSubTab
  planningTab: PlanningTab
  warehousesTab: WarehousesTab
  warehousesFeedingSubTab: WarehousesFeedingSubTab
  warehousesEquipmentSubTab: WarehousesEquipmentSubTab
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
    | 'attendanceSubTab'
    | 'planningTab'
    | 'warehousesTab'
    | 'warehousesFeedingSubTab'
    | 'warehousesEquipmentSubTab'
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
  setAttendanceSubTab: (tab: AttendanceSubTab) => void
  setPlanningTab: (tab: PlanningTab) => void
  setWarehousesTab: (tab: WarehousesTab) => void
  setWarehousesFeedingSubTab: (tab: WarehousesFeedingSubTab) => void
  setWarehousesEquipmentSubTab: (tab: WarehousesEquipmentSubTab) => void
  setQualityTab: (tab: QualityTab) => void
  setWorkerProfileTab: (tab: WorkerProfileTab) => void
  setSidebarOpen: (open: boolean) => void
  navigate: (patch: NavigatePatch) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

const NAV_STORAGE_KEY = 'app.nav.state.v1'

const PRODUCTIVITY_TABS: ProductivityTab[] = ['productivity', 'stops']

function normalizeProductivityTab(tab: string | undefined): ProductivityTab {
  if (tab === 'productivity' || tab === 'stops') return tab
  if (tab === 'entry' || tab === 'exit' || tab === 'summary') return 'productivity'
  return initialState.productivityTab
}
const PLANNING_TABS: PlanningTab[] = ['plan', 'workDays', 'tracking', 'orders']

const initialState: NavState = {
  department: 'production',
  productionArea: 'assembly',
  productionPage: 'home',
  engineeringPage: 'home',
  showProfile: false,
  profileTab: 'account',
  showGlobalHome: true,
  bomTab: 'consolidated',
  lineBalancingTab: 'operations',
  trainingTab: 'org',
  settingsTab: 'administrations',
  productivityTab: 'productivity',
  productivitySubTab: 'monthly',
  productivityStopFormOpen: false,
  attendanceSubTab: 'today',
  planningTab: 'plan',
  warehousesTab: 'home',
  warehousesFeedingSubTab: 'plan',
  warehousesEquipmentSubTab: 'racks',
  qualityTab: 'record',
  workerProfileTab: 'data',
  sidebarOpen: false
}

function loadNavState(): NavState {
  try {
    const raw = sessionStorage.getItem(NAV_STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<NavState> & {
      productivityTab?: string
      productionPlanTab?: string
    }

    // ترحيل: الخطة / الأوامر / أيام العمل كانت تحت الإنتاجية
    const legacyProductivityTab = parsed.productivityTab as string | undefined
    const legacyToPlanning: PlanningTab | null =
      legacyProductivityTab === 'orders'
        ? 'orders'
        : legacyProductivityTab === 'workDays'
          ? 'workDays'
          : null
    const productivityTab = PRODUCTIVITY_TABS.includes(parsed.productivityTab as ProductivityTab)
      ? (parsed.productivityTab as ProductivityTab)
      : normalizeProductivityTab(parsed.productivityTab)
    const planningTab = PLANNING_TABS.includes(parsed.planningTab as PlanningTab)
      ? (parsed.planningTab as PlanningTab)
      : legacyToPlanning ?? initialState.planningTab

    const legacyWorkerPage = parsed.productionPage === 'workerProfile'
    const profileTab: ProfileTab = legacyWorkerPage
      ? profileTabFromWorkerTab((parsed.workerProfileTab as WorkerProfileTab) ?? 'data')
      : PROFILE_TABS.includes(parsed.profileTab as ProfileTab)
        ? (parsed.profileTab as ProfileTab)
        : initialState.profileTab

    return {
      ...initialState,
      ...parsed,
      bomTab: normalizeBomTab(parsed.bomTab as string | undefined),
      productivityTab,
      planningTab,
      profileTab,
      ...(legacyToPlanning
        ? { department: 'planning' as const, planningTab: legacyToPlanning, showGlobalHome: false }
        : {}),
      ...(legacyWorkerPage
        ? { showProfile: true, productionPage: 'home' as const, showGlobalHome: false }
        : {}),
      sidebarOpen: false,
      productivityStopFormOpen: false
    }
  } catch {
    return initialState
  }
}

function persistNavState(state: NavState) {
  try {
    const { sidebarOpen: _s, productivityStopFormOpen: _p, ...rest } = state
    sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(rest))
  } catch {
    /* ignore quota / private mode */
  }
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavState>(loadNavState)

  useEffect(() => {
    persistNavState(state)
  }, [state])

  const navigate = useCallback((patch: NavigatePatch) => {
    setState(prev => {
      if (patch.productionPage === 'workerProfile') {
        const profileTab = profileTabFromWorkerTab((patch.workerProfileTab ?? prev.workerProfileTab) as WorkerProfileTab)
        return {
          ...prev,
          showProfile: true,
          profileTab,
          showGlobalHome: false,
          sidebarOpen: patch.closeSidebar === true ? false : prev.sidebarOpen
        }
      }

      const leavesGlobalHome =
        patch.department != null ||
        patch.productionArea != null ||
        patch.productionPage != null ||
        patch.engineeringPage != null ||
        patch.planningTab != null ||
        patch.warehousesTab != null ||
        patch.qualityTab != null
      const next = {
        ...prev,
        ...patch,
        showProfile:
          patch.showProfile ??
          (patch.productionArea != null ||
          patch.productionPage != null ||
          patch.engineeringPage != null ||
          patch.planningTab != null ||
          patch.department != null
            ? false
            : prev.showProfile),
        showGlobalHome:
          patch.showGlobalHome ??
          (patch.showProfile === true || leavesGlobalHome ? false : prev.showGlobalHome),
        sidebarOpen: patch.closeSidebar === false ? prev.sidebarOpen : patch.closeSidebar === true ? false : prev.sidebarOpen
      }
      if (patch.bomTab != null) next.bomTab = normalizeBomTab(patch.bomTab as string)
      return next
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
        ...(changed && department === 'planning' ? { planningTab: 'plan' as const } : {}),
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
      setBomTab: bomTab => setState(prev => ({ ...prev, bomTab: normalizeBomTab(bomTab) })),
      setLineBalancingTab: lineBalancingTab => setState(prev => ({ ...prev, lineBalancingTab })),
      setTrainingTab: trainingTab => setState(prev => ({ ...prev, trainingTab })),
      setSettingsTab: settingsTab => setState(prev => ({ ...prev, settingsTab })),
      setProductivityTab: productivityTab => setState(prev => ({ ...prev, productivityTab })),
      setProductivitySubTab: productivitySubTab => setState(prev => ({ ...prev, productivitySubTab })),
      setProductivityStopFormOpen: productivityStopFormOpen => setState(prev => ({ ...prev, productivityStopFormOpen })),
      setAttendanceSubTab: attendanceSubTab => setState(prev => ({ ...prev, attendanceSubTab })),
      setPlanningTab: planningTab => setState(prev => ({ ...prev, planningTab })),
      setWarehousesTab: warehousesTab => setState(prev => ({ ...prev, warehousesTab })),
      setWarehousesFeedingSubTab: warehousesFeedingSubTab => setState(prev => ({ ...prev, warehousesFeedingSubTab })),
      setWarehousesEquipmentSubTab: warehousesEquipmentSubTab => setState(prev => ({ ...prev, warehousesEquipmentSubTab })),
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
