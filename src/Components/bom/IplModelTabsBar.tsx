import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { VehicleModel } from '../../Types/settings'
import { buildModelFamilyGroups, isGdAggregateFamily } from '../../Utils/vehicleModelHierarchy'

type Props = {
  models: VehicleModel[]
  allModels: VehicleModel[]
  openTabs: string[]
  onToggleModel: (modelName: string) => void
  onToggleFamily: (variantNames: string[]) => void
  compact?: boolean
}

export function IplModelTabsBar({ models, allModels, openTabs, onToggleModel, onToggleFamily, compact = false }: Props) {
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

  function familyLabel(name: string): string {
    if (isGdAggregateFamily(name)) return t('bom.iplFamilyMicrobusGd')
    return name
  }

  const chipRow = compact ? 'flex gap-1 overflow-x-auto pb-0.5' : 'flex flex-wrap gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2'
  const chip = compact ? 'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold transition' : 'rounded-lg border px-2.5 py-1 text-xs font-bold transition'

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
      {families.length > 0 && (
        <div>
          <span className={`block font-bold uppercase text-violet-300 ${compact ? 'mb-1 text-[10px]' : 'mb-2 text-[10px]'}`}>
            {t('bom.iplModelPickFamily')}
          </span>
          <div className={chipRow}>
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
                  className={`${chip} ${
                    allOn
                      ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                      : someOn
                        ? 'border-violet-500/35 bg-violet-500/10 text-violet-200 ring-1 ring-inset ring-violet-400/30'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {familyLabel(family.name)}
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
        <span className={`block font-bold uppercase text-cyan-300 ${compact ? 'mb-1 text-[10px]' : 'mb-2 text-[10px]'}`}>
          {t('bom.iplModelPick')}
        </span>
        <div className={chipRow}>
          {families.map(({ variants }) =>
            variants.map(m => {
              const open = openSet.has(m.name)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleModel(m.name)}
                  className={`${chip} ${
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
                className={`${chip} ${
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
        {compact ? null : <p className="mt-1.5 text-[10px] text-slate-600">{t('bom.iplModelTabsHint')}</p>}
      </div>
    </div>
  )
}
