import { useEffect, useMemo } from 'react'
import { useLang } from '../i18n/LanguageContext'
import type { VehicleModel } from '../Types/settings'
import { buildModelFamilyGroups, isAssignableModel } from '../Utils/vehicleModelHierarchy'

type Props = {
  models: VehicleModel[]
  familyId: string
  variantId: string
  onFamilyChange: (familyId: string) => void
  onVariantChange: (variantId: string) => void
  loading?: boolean
  className?: string
}

function activeVariants(models: VehicleModel[], familyId: string) {
  const { groups, orphanVariants } = buildModelFamilyGroups(models)
  const group = groups.find(g => g.family.id === familyId)
  const fromGroup = (group?.variants ?? []).filter(isAssignableModel)
  if (fromGroup.length > 0) return fromGroup

  const direct = models.filter(
    m => m.parent_model_id === familyId && m.model_kind !== 'family' && m.is_active
  )
  if (direct.length > 0) return direct

  return orphanVariants.filter(isAssignableModel)
}

export function VehicleModelFamilyPicker({
  models,
  familyId,
  variantId,
  onFamilyChange,
  onVariantChange,
  loading,
  className = ''
}: Props) {
  const { t } = useLang()

  const { families, flatVariants, mode } = useMemo(() => {
    const { groups, orphanVariants } = buildModelFamilyGroups(models)
    const fams = groups
      .map(g => g.family)
      .filter(f => f.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))

    if (fams.length > 0) {
      return { families: fams, flatVariants: [] as VehicleModel[], mode: 'hierarchy' as const }
    }

    const flat = [
      ...orphanVariants.filter(isAssignableModel),
      ...models.filter(m => m.model_kind !== 'family' && m.is_active && !m.parent_model_id)
    ]
      .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
      .sort((a, b) => a.name.localeCompare(b.name))

    return { families: [], flatVariants: flat, mode: flat.length > 0 ? ('flat' as const) : ('empty' as const) }
  }, [models])

  const variants = useMemo(
    () => (mode === 'hierarchy' ? activeVariants(models, familyId) : flatVariants),
    [mode, models, familyId, flatVariants]
  )

  useEffect(() => {
    if (loading || mode !== 'hierarchy' || familyId || families.length === 0) return
    onFamilyChange(families[0].id)
  }, [loading, mode, familyId, families, onFamilyChange])

  useEffect(() => {
    if (loading || !variantId) return
    if (!variants.some(v => v.id === variantId)) onVariantChange('')
  }, [loading, variantId, variants, onVariantChange])

  if (loading) {
    return <p className={`text-sm text-slate-500 ${className}`}>{t('common.loading')}</p>
  }

  if (mode === 'empty') {
    return (
      <p className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 ${className}`}>
        {t('mp.noModelsInSettings')}
      </p>
    )
  }

  if (mode === 'flat') {
    return (
      <label className={`block space-y-2 ${className}`}>
        <span className="text-sm font-bold text-slate-300">
          {t('mp.f.model')} <span className="text-red-400">*</span>
        </span>
        <select className="input-dark" value={variantId} onChange={e => onVariantChange(e.target.value)}>
          <option value="">{t('mp.selectVariant')}</option>
          {flatVariants.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-300">{t('settings.models.family')}</span>
        <select className="input-dark" value={familyId} onChange={e => onFamilyChange(e.target.value)}>
          <option value="">{t('settings.models.selectParent')}</option>
          {families.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-300">
          {t('settings.models.variant')} <span className="text-red-400">*</span>
        </span>
        <select
          className="input-dark"
          value={variantId}
          disabled={!familyId}
          onChange={e => onVariantChange(e.target.value)}
        >
          <option value="">{familyId ? t('mp.selectVariant') : t('settings.models.selectParent')}</option>
          {variants.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {familyId && variants.length === 0 && (
          <p className="text-xs text-amber-300">{t('settings.models.noVariants')}</p>
        )}
      </label>
    </div>
  )
}

export function resolveFamilyIdForVariant(models: VehicleModel[], variantId: string): string {
  if (!variantId) return ''
  const m = models.find(x => x.id === variantId)
  return m?.parent_model_id ?? ''
}
