import { useMemo } from 'react'
import { Shield } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { usePermissions } from '../../Context/PermissionsContext'
import {
  formatPermissionLabel,
  groupModulesForMatrix,
  sortActionsForMatrix
} from '../../Utils/permissionLabels'

export function MyProfilePermissionsTab() {
  const { t, lang } = useLang()
  const { permissions, loading } = usePermissions()

  const groups = useMemo(() => {
    const byModule = new Map<string, string[]>()
    for (const [key, allowed] of Object.entries(permissions)) {
      if (!allowed) continue
      const dot = key.indexOf('.')
      if (dot < 0) continue
      const module = key.slice(0, dot)
      const action = key.slice(dot + 1)
      if (module === 'users' && action === 'manage') continue
      const list = byModule.get(module) ?? []
      list.push(action)
      byModule.set(module, list)
    }
    const moduleKeys = [...byModule.keys()]
    return groupModulesForMatrix(moduleKeys, t, lang).map(g => ({
      ...g,
      modules: g.modules.map(m => ({
        module: m,
        actions: sortActionsForMatrix(byModule.get(m) ?? [])
      }))
    }))
  }, [permissions, t, lang])

  if (loading) return <p className="text-sm text-slate-400">{t('common.loading')}</p>

  return (
    <section className="card-industrial space-y-4 p-6">
      <div className="flex items-center gap-2 text-violet-300">
        <Shield className="h-5 w-5" />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.permissionsSection')}</h3>
      </div>
      <p className="text-sm text-slate-500">{t('myProfile.permissionsHint')}</p>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">{t('myProfile.permissionsEmpty')}</p>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.groupKey}>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{g.groupLabel}</p>
              <div className="space-y-2">
                {g.modules.map(({ module, actions }) => (
                  <div key={module} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="mb-2 text-sm font-bold text-slate-200">{t(`permissions.modules.${module}`) === `permissions.modules.${module}` ? module : t(`permissions.modules.${module}`)}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map(action => (
                        <span
                          key={action}
                          className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-200"
                        >
                          {formatPermissionLabel(module, action, t).split(' — ')[1] ?? action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
