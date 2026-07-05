import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useDepartmentNavPages } from '../../hooks/useDepartmentNavPages'
import type { DepartmentId } from '../../Types/navigation'

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
  const { pagesForDepartment, isPageActive, isProductionAreaActive, productionAreaTabs, settingsPage, currentDepartment, showProfile } =
    useDepartmentNavPages()
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  useEffect(() => {
    if (!expandedPage) return
    function onDocClick() {
      setExpandedPage(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [expandedPage])

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

  if (showProfile || isGlobalHomeActive) return null
  if (!isSettingsActive && !hasSectionPages) return null

  return (
    <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-2 shadow-lg shadow-black/25 backdrop-blur-md sm:-mx-0 sm:p-3">
      <div className="space-y-2">
        {isSettingsActive && settingsTabs.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('nav.settings')}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {settingsTabs.map(tab => {
                const active = nav.settingsTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                      active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
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
                  {areaTabs.map(page => {
                    const active = isProductionAreaActive(page.key)
                    return (
                      <button
                        key={page.key}
                        type="button"
                        onClick={() => {
                          setExpandedPage(null)
                          page.onNavigate()
                        }}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                          active ? 'bg-slate-100 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {page.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {(!isProduction || showAssemblyPages) && sectionPages.length > 0 && (
              <div className={isProduction || isSettingsActive ? 'border-t border-slate-800 pt-2' : ''}>
                <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isProduction
                    ? t('departments.assemblyTabs')
                    : currentDepartment === 'engineering'
                      ? t('departments.engineeringTabs')
                      : currentDepartment === 'quality'
                        ? t('departments.qualityTabs')
                        : currentDepartment === 'hr'
                          ? t('departments.hrTabs')
                          : t(`departments.${currentDepartment}`)}
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {sectionPages.map(page => {
                    const active = isPageActive(currentDepartment, page.key)
                    const hasChildren = Boolean(page.children?.length)
                    const open = expandedPage === page.key

                    return (
                      <div key={page.key} className="relative shrink-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            if (hasChildren) {
                              setExpandedPage(open ? null : page.key)
                              page.onNavigate()
                            } else {
                              setExpandedPage(null)
                              page.onNavigate()
                            }
                          }}
                          className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm ${
                            active ? 'bg-slate-100 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {page.label}
                          {hasChildren && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
                        </button>

                        {hasChildren && open && (
                          <div className="absolute start-0 top-full z-40 mt-1 min-w-[12rem] rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
                            {page.children!.map(child => (
                              <button
                                key={child.key}
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  child.onClick()
                                  setExpandedPage(null)
                                }}
                                className="block w-full px-3 py-2 text-start text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
                              >
                                {child.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
