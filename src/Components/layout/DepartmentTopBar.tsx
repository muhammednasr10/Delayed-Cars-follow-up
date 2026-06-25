import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DEPARTMENTS, departmentAccentClass } from '../../config/departments'
import { useLang } from '../../i18n/LanguageContext'
import { useDepartmentNavPages } from '../../hooks/useDepartmentNavPages'
import type { DepartmentId } from '../../Types/navigation'

const IMPLEMENTED_DEPARTMENTS = new Set<DepartmentId>(['production', 'engineering', 'warehouses'])

export function DepartmentTopBar() {
  const { t } = useLang()
  const { pagesForDepartment, isPageActive, selectDepartment, currentDepartment, showProfile } = useDepartmentNavPages()
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  useEffect(() => {
    if (!expandedPage) return
    function onDocClick() {
      setExpandedPage(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [expandedPage])

  const sectionPages = pagesForDepartment(currentDepartment).filter(p => p.visible)
  const hasSectionPages = IMPLEMENTED_DEPARTMENTS.has(currentDepartment) && sectionPages.length > 0

  return (
    <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-2 shadow-lg shadow-black/25 backdrop-blur-md sm:-mx-0 sm:p-3">
      <div className="space-y-2">
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{t('departments.sectionLabel')}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DEPARTMENTS.map(dept => {
              const Icon = dept.icon
              const active = !showProfile && currentDepartment === dept.id
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
          </div>
        </div>

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
