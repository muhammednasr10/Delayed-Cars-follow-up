import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { VehicleModel } from '../../Types/settings'
import { buildModelFamilyGroups } from '../../Utils/vehicleModelHierarchy'

type Props = {
  models: VehicleModel[]
  allModels: VehicleModel[]
  openTabs: string[]
  onToggleModel: (modelName: string) => void
  onToggleFamily: (variantNames: string[]) => void
}

export function IplModelTabsBar({ models, allModels, openTabs, onToggleModel, onToggleFamily }: Props) {
  const { t } = useLang()
  const openSet = new Set(openTabs)
  const variantIds = useMemo(() => new Set(models.map(m => m.id)), [models])

  const { families, orphans } = useMemo(() => {
    const { groups, orphanVariants } = buildModelFamilyGroups(allModels)
    const families = groups
      .map(g => ({
        family: g.family,
        variants: g.variants.filter(v => variantIds.has(v.id) && v.is_active)
      }))
      .filter(g => g.variants.length > 0)
    const orphans = orphanVariants.filter(v => variantIds.has(v.id) && v.is_active)
    return { families, orphans }
  }, [allModels, variantIds])

  return (
    <div className="space-y-3">
      {families.length > 0 && (
        <div>
          <span className="mb-2 block text-[10px] font-bold uppercase text-violet-300">{t('bom.iplModelPickFamily')}</span>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2">
            {families.map(({ family, variants }) => {
              const names = variants.map(v => v.name)
              const selectedCount = names.filter(n => openSet.has(n)).length
              const allOn = selectedCount === names.length
              const someOn = selectedCount > 0 && !allOn
              return (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => onToggleFamily(names)}
                  title={names.join(' · ')}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                    allOn
                      ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                      : someOn
                        ? 'border-violet-500/35 bg-violet-500/10 text-violet-200 ring-1 ring-inset ring-violet-400/30'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {family.name}
                  <span className="ms-1.5 text-[10px] font-black opacity-70">
                    {selectedCount}/{names.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <span className="mb-2 block text-[10px] font-bold uppercase text-cyan-300">{t('bom.iplModelPick')}</span>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2">
          {families.map(({ variants }) =>
            variants.map(m => {
              const open = openSet.has(m.name)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleModel(m.name)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                    open
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {m.name}
                </button>
              )
            })
          )}
          {orphans.map(m => {
            const open = openSet.has(m.name)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggleModel(m.name)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                  open
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {m.name}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-600">{t('bom.iplModelTabsHint')}</p>
      </div>
    </div>
  )
}
