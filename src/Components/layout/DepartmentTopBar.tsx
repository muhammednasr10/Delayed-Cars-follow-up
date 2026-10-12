import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { DEPARTMENTS } from '../../config/departments'
import { pagePermForQuality, canViewAnyWarehousesPage } from '../../config/pageAccess'
import { useCanViewPage } from '../../hooks/useCanViewPage'
import { useDepartmentNavPages, type NavPageItem } from '../../hooks/useDepartmentNavPages'
import type { DepartmentId } from '../../Types/navigation'
import { SETTINGS_STATIONS_SUB_TAB_ORDER } from '../../Types/navigation'
import { NavTabButton } from './NavTabButton'

/** أقسام تظهر صفحاتها في الشريط العلوي — التخطيط له تبويبات داخل الصفحة فلا يُكرَّر هنا */
const IMPLEMENTED_DEPARTMENTS = new Set<DepartmentId>(['production', 'engineering', 'warehouses', 'quality', 'hr'])

export function DepartmentTopBar() {
  const { t } = useLang()
  const nav = useNavigation()
  const { loading: permsLoading, canViewModule } = usePermissions()
  const { canViewPage, loading: pagesLoading } = useCanViewPage()
  const navLoading = permsLoading || pagesLoading
  const departments = DEPARTMENTS.filter(dept => {
    if (dept.id === 'quality') return navLoading || canViewPage(pagePermForQuality())
    if (dept.id === 'hr') return navLoading || canViewModule('employees')
    if (dept.id === 'warehouses') return navLoading || canViewAnyWarehousesPage(canViewPage)
    return true
  })
  const {
    pagesForDepartment,
    isPageActive,
    isNavChildActive,
    isProductionAreaActive,
    productionAreaTabs,
    settingsPage,
    currentDepartment,
    showProfile
  } = useDepartmentNavPages()

  const isGlobalHomeActive = !showProfile && nav.showGlobalHome
  const isSettingsActive =
    !showProfile && !nav.showGlobalHome && nav.department === 'production' && nav.productionPage === 'settings'
  const sectionPages = pagesForDepartment(currentDepartment).filter(p => p.visible)
  const areaTabs = productionAreaTabs.filter(p => p.visible)
  const isProduction = currentDepartment === 'production'
  const showAreaPages =
    isProduction &&
    (nav.productionArea === 'assembly' || nav.productionArea === 'body' || nav.productionArea === 'paint') &&
    nav.productionPage !== 'overview'
  const hasSectionPages =
    !isGlobalHomeActive &&
    !showProfile &&
    !isSettingsActive &&
    IMPLEMENTED_DEPARTMENTS.has(currentDepartment) &&
    ((isProduction && areaTabs.length > 0) || (!isProduction && sectionPages.length > 0))
  const settingsTabs = settingsPage.visible ? (settingsPage.children ?? []) : []

  const activePageWithChildren = useMemo(() => {
    if (!hasSectionPages || (isProduction && !showAreaPages)) return null
    return sectionPages.find(p => p.children?.length && isPageActive(currentDepartment, p.key)) ?? null
  }, [hasSectionPages, isProduction, showAreaPages, sectionPages, currentDepartment, isPageActive])

  const showSectionNav = !showProfile && !isGlobalHomeActive && (isSettingsActive || hasSectionPages)

  const rowCls =
    'flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

  function departmentActive(id: DepartmentId) {
    return (
      !showProfile &&
      !isGlobalHomeActive &&
      currentDepartment === id &&
      !(id === 'production' && isSettingsActive)
    )
  }

  function renderChildRow(page: NavPageItem) {
    if (!page.children?.length) return null
    return (
      <div className={rowCls}>
        {page.children.map(child => (
          <NavTabButton
            key={child.key}
            label={child.label}
            icon={child.icon}
            compact
            active={isNavChildActive(currentDepartment, page.key, child.key)}
            onClick={child.onClick}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/95 px-1.5 py-1 shadow-lg shadow-black/25 backdrop-blur-md">
      <div className="flex flex-col gap-1">
        <div className={rowCls}>
          {departments.map(dept => (
            <NavTabButton
              key={dept.id}
              label={t(`departments.${dept.id}`)}
              icon={dept.icon}
              compact
              active={departmentActive(dept.id)}
              onClick={() => nav.selectDepartment(dept.id)}
            />
          ))}
        </div>

        {showSectionNav && isSettingsActive && settingsTabs.length > 0 && (
          <div className={rowCls}>
            {settingsTabs.map(tab => (
              <NavTabButton
                key={tab.key}
                label={tab.label}
                icon={tab.icon}
                compact
                active={nav.settingsTab === tab.key}
                onClick={tab.onClick}
              />
            ))}
          </div>
        )}

        {showSectionNav && isSettingsActive && nav.settingsTab === 'stations' && (
          <div className={rowCls}>
            {SETTINGS_STATIONS_SUB_TAB_ORDER.map(key => (
              <NavTabButton
                key={key}
                label={t(`settings.stationsSubTabs.${key}`)}
                compact
                active={nav.settingsStationsSubTab === key}
                onClick={() => nav.setSettingsStationsSubTab(key)}
              />
            ))}
          </div>
        )}

        {showSectionNav && hasSectionPages && (
          <>
            {isProduction && areaTabs.length > 0 && (
              <div className={rowCls}>
                {areaTabs.map(page => (
                  <NavTabButton
                    key={page.key}
                    label={page.label}
                    icon={page.icon}
                    compact
                    active={isProductionAreaActive(page.key)}
                    onClick={() => page.onNavigate()}
                  />
                ))}
              </div>
            )}

            {(!isProduction || showAreaPages) && sectionPages.length > 0 && (
              <div className={rowCls}>
                {sectionPages.map(page => (
                  <NavTabButton
                    key={page.key}
                    label={page.label}
                    icon={page.icon}
                    compact
                    active={isPageActive(currentDepartment, page.key)}
                    onClick={() => page.onNavigate()}
                  />
                ))}
              </div>
            )}
            {activePageWithChildren && renderChildRow(activePageWithChildren)}
          </>
        )}
      </div>
    </div>
  )
}
