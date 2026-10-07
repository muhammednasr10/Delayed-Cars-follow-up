import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  parentModelId: string | null
  variantModelId: string | null
  onParentChange: (parentModelId: string | null) => void
  onVariantChange: (variantModelId: string | null) => void
}

export function MissionModelFields({ models, parentModelId, variantModelId, onParentChange, onVariantChange }: Props) {
  const { t } = useLang()
  const families = useMemo(
    () =>
      models
        .filter(model => model.model_kind === 'family' && (model.is_active || model.id === parentModelId))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [models, parentModelId]
  )
  const variants = useMemo(
    () =>
      models
        .filter(
          model =>
            model.model_kind === 'variant' &&
            model.parent_model_id === parentModelId &&
            (model.is_active || model.id === variantModelId)
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [models, parentModelId, variantModelId]
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t('missions.cols.parentModel')}>
        <select
          className={inputCls()}
          value={parentModelId ?? ''}
          onChange={e => onParentChange(e.target.value || null)}
        >
          <option value="">{t('missions.selectParentModel')}</option>
          {families.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('missions.cols.variantModel')}>
        <select
          className={inputCls()}
          value={variantModelId ?? ''}
          disabled={!parentModelId}
          onChange={e => onVariantChange(e.target.value || null)}
        >
          <option value="">{t('missions.selectVariantModel')}</option>
          {variants.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
