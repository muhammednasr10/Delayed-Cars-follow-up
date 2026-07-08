import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useDepartmentNavPages, type NavPageItem } from '../../hooks/useDepartmentNavPages'
import type { DepartmentId } from '../../Types/navigation'
import { NavTabButton } from './NavTabButton'

/** أقسام تظهر صفحاتها في الشريط العلوي — التخطيط له تبويبات داخل الصفحة فلا يُكرَّر هنا */
const IMPLEMENTED_DEPARTMENTS = new Set<DepartmentId>([
  'production',
  'engineering',
  'warehouses',
  'quality',
  'hr'
])

export function DepartmentTopBar() {
  const { t } = useLang()
  const nav = useNavigation()
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
  const isSettingsActive = !showProfile && !nav.showGlobalHome && nav.department === 'production' && nav.productionPage === 'settings'
  const sectionPages = pagesForDepartment(currentDepartment).filter(p => p.visible)
  const areaTabs = productionAreaTabs.filter(p => p.visible)
  const isProduction = currentDepartment === 'production'
  const showAssemblyPages = isProduction && nav.productionArea === 'assembly'
  const hasSectionPages =
    !isGlobalHomeActive &&
    !showProfile &&
    !isSettingsActive &&
    IMPLEMENTED_DEPARTMENTS.has(currentDepartment) &&
    ((isProduction && areaTabs.length > 0) || (!isProduction && sectionPages.length > 0))
  const settingsTabs = settingsPage.visible ? settingsPage.children ?? [] : []

  const activePageWithChildren = useMemo(() => {
    if (!hasSectionPages || isProduction && !showAssemblyPages) return null
    return sectionPages.find(p => p.children?.length && isPageActive(currentDepartment, p.key)) ?? null
  }, [hasSectionPages, isProduction, showAssemblyPages, sectionPages, currentDepartment, isPageActive])

  if (showProfile || isGlobalHomeActive) return null
  if (!isSettingsActive && !hasSectionPages) return null

  function renderChildRow(page: NavPageItem) {
    if (!page.children?.length) return null
    return (
      <div className="border-t border-slate-800/80 pt-2">
        <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-cyan-400/70">
          {page.label}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-2 shadow-lg shadow-black/25 backdrop-blur-md sm:-mx-0 sm:p-3">
      <div className="space-y-2">
        {isSettingsActive && settingsTabs.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('nav.settings')}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {settingsTabs.map(tab => (
                <NavTabButton
                  key={tab.key}
                  label={tab.label}
                  icon={tab.icon}
                  active={nav.settingsTab === tab.key}
                  onClick={tab.onClick}
                />
              ))}
            </div>
          </div>
        )}

        {hasSectionPages && (
          <>
            {isProduction && areaTabs.length > 0 && (
              <div className={isSettingsActive ? 'border-t border-slate-800 pt-2' : ''}>
                <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t('departments.productionAreas')}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {areaTabs.map(page => (
                    <NavTabButton
                      key={page.key}
                      label={page.label}
                      icon={page.icon}
                      active={isProductionAreaActive(page.key)}
                      onClick={() => page.onNavigate()}
                    />
                  ))}
                </div>
              </div>
            )}

            {(!isProduction || showAssemblyPages) && sectionPages.length > 0 && (
              <div className={isProduction || isSettingsActive ? 'border-t border-slate-800 pt-2' : ''}>
                <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isProduction
                    ? t('departments.assemblyTabs')
                    : currentDepartment === 'warehouses'
                      ? t('departments.warehousesTabs')
                      : currentDepartment === 'engineering'
                        ? t('departments.engineeringTabs')
                        : currentDepartment === 'quality'
                          ? t('departments.qualityTabs')
                          : currentDepartment === 'hr'
                            ? t('departments.hrTabs')
                            : t(`departments.${currentDepartment}`)}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {sectionPages.map(page => (
                    <NavTabButton
                      key={page.key}
                      label={page.label}
                      icon={page.icon}
                      active={isPageActive(currentDepartment, page.key)}
                      onClick={() => page.onNavigate()}
                    />
                  ))}
                </div>
                {activePageWithChildren && renderChildRow(activePageWithChildren)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
