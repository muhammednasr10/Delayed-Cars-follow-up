import { ChevronDown, Home, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEPARTMENTS, departmentAccentClass } from '../../config/departments'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { useDepartmentNavPages } from '../../hooks/useDepartmentNavPages'
import type { DepartmentId } from '../../Types/navigation'

const IMPLEMENTED_DEPARTMENTS = new Set<DepartmentId>(['production', 'engineering', 'warehouses'])
const DEPT_COLLAPSE_KEY = 'nav.departmentsOpen'

function readDepartmentsOpen(): boolean {
  try {
    return localStorage.getItem(DEPT_COLLAPSE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function DepartmentTopBar() {
  const { t } = useLang()
  const nav = useNavigation()
  const { pagesForDepartment, isPageActive, selectDepartment, settingsPage, currentDepartment, showProfile } =
    useDepartmentNavPages()
  const [expandedPage, setExpandedPage] = useState<string | null>(null)
  const [departmentsOpen, setDepartmentsOpen] = useState(readDepartmentsOpen)

  useEffect(() => {
    try {
      localStorage.setItem(DEPT_COLLAPSE_KEY, String(departmentsOpen))
    } catch {
      /* ignore */
    }
  }, [departmentsOpen])

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
  const hasSectionPages =
    !isGlobalHomeActive &&
    !isSettingsActive &&
    IMPLEMENTED_DEPARTMENTS.has(currentDepartment) &&
    sectionPages.length > 0
  const settingsTabs = settingsPage.visible ? settingsPage.children ?? [] : []

  function openSettings() {
    setExpandedPage(null)
    settingsPage.onNavigate()
  }

  function toggleDepartments() {
    setDepartmentsOpen(open => !open)
  }

  return (
    <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-2 shadow-lg shadow-black/25 backdrop-blur-md sm:-mx-0 sm:p-3">
      <div className="space-y-2">
        <div>
          <button
            type="button"
            onClick={toggleDepartments}
            className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-start transition hover:bg-slate-800/50"
            aria-expanded={departmentsOpen}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('departments.sectionLabel')}</p>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${departmentsOpen ? '' : '-rotate-90'}`} />
          </button>

          {departmentsOpen && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => nav.openGlobalHome()}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-black transition sm:px-3 sm:text-sm ${
                  isGlobalHomeActive
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/10'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={t('nav.globalHome')}
              >
                <Home className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t('nav.globalHome')}</span>
              </button>

              {DEPARTMENTS.map(dept => {
                const Icon = dept.icon
                const active = !showProfile && !isGlobalHomeActive && !isSettingsActive && currentDepartment === dept.id
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => selectDepartment(dept.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-black transition sm:px-3 sm:text-sm ${departmentAccentClass(dept.accent, active)}`}
                    title={t(`departments.${dept.id}`)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{t(`departments.${dept.id}`)}</span>
                  </button>
                )
              })}

              {settingsPage.visible && (
                <button
                  type="button"
                  onClick={openSettings}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-black transition sm:px-3 sm:text-sm ${
                    isSettingsActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={t('nav.settings')}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{t('nav.settings')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {isSettingsActive && settingsTabs.length > 0 && (
          <div className="border-t border-slate-800 pt-2">
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

        {hasSectionPages && !showProfile && (
          <div className="border-t border-slate-800 pt-2">
            <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {currentDepartment === 'production'
                ? t('departments.productionTabs')
                : currentDepartment === 'engineering'
                  ? t('departments.engineeringTabs')
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
      </div>
    </div>
  )
}
