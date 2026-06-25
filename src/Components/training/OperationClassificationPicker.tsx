import { useEffect, useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import {
  familiesForModelLine,
  variantNamesForFamily,
  variantsForFamily
} from '../../Utils/operationClassificationBuilder'
import { formatOperationClassification } from '../../Utils/operationClassification'
import { MODEL_LINE_STYLES, type ModelLine } from '../../Utils/modelLines'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  modelLine: ModelLine
  parentModelId: string
  selectedVariantNames: string[]
  classificationPreview: string
  onParentModelChange: (id: string) => void
  onVariantsChange: (names: string[]) => void
}

export function OperationClassificationPicker({
  models,
  modelLine,
  parentModelId,
  selectedVariantNames,
  classificationPreview,
  onParentModelChange,
  onVariantsChange
}: Props) {
  const { t } = useLang()
  const lineStyle = MODEL_LINE_STYLES[modelLine]

  const families = useMemo(() => familiesForModelLine(models, modelLine), [models, modelLine])
  const familyName = families.find(f => f.id === parentModelId)?.name ?? modelLine
  const variants = useMemo(
    () => (parentModelId ? variantsForFamily(models, parentModelId) : []),
    [models, parentModelId]
  )
  const allNames = useMemo(
    () => (parentModelId ? variantNamesForFamily(models, parentModelId) : []),
    [models, parentModelId]
  )

  useEffect(() => {
    const familyId = families[0]?.id
    if (familyId && familyId !== parentModelId) onParentModelChange(familyId)
  }, [families, parentModelId, onParentModelChange])

  const isCommon = selectedVariantNames.length === 0

  const selectedLabels = useMemo(() => {
    if (isCommon) return t('operations.classificationAllBranches', { line: familyName })
    const codes = allNames.filter(n =>
      selectedVariantNames.some(s => s.toUpperCase() === n.toUpperCase())
    )
    return codes.join(' + ') || selectedVariantNames.join(' + ')
  }, [isCommon, selectedVariantNames, allNames, familyName, t])

  function pickCommon() {
    onVariantsChange([])
  }

  function pickAllVariants() {
    onVariantsChange([...allNames])
  }

  function pickVariant(name: string) {
    const upper = name.toUpperCase()
    const exists = selectedVariantNames.some(v => v.toUpperCase() === upper)
    if (isCommon) {
      onVariantsChange([name])
      return
    }
    if (exists) {
      onVariantsChange(selectedVariantNames.filter(v => v.toUpperCase() !== upper))
    } else {
      onVariantsChange([...selectedVariantNames, name])
    }
  }

  if (families.length === 0) {
    return (
      <div className="sm:col-span-2">
        <p className="text-xs text-amber-300">{t('mp.noModelsInSettings')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-slate-300">{t('operations.opType')}</span>
        <span
          className={`rounded-lg px-2.5 py-0.5 text-xs font-black ${lineStyle.tabActive}`}
        >
          {familyName}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pickCommon}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            isCommon
              ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {t('operations.classificationCommonBtn')}
        </button>
        {allNames.length > 1 && (
          <button
            type="button"
            onClick={pickAllVariants}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              !isCommon && selectedVariantNames.length >= allNames.length
                ? 'bg-violet-500 text-white ring-2 ring-violet-400/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('operations.allVariantsShort')}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {isCommon
          ? t('operations.classificationCommonHint', { line: familyName })
          : t('operations.classificationPickVariants')}
      </p>

      {variants.length === 0 ? (
        <p className="text-xs text-slate-500">{t('settings.models.noVariants')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          {variants.map(v => {
            const selected = selectedVariantNames.some(n => n.toUpperCase() === v.name.toUpperCase())
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => pickVariant(v.name)}
                className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  selected
                    ? 'border-violet-400 bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/40'
                    : isCommon
                      ? 'border-slate-600 border-dashed bg-slate-800/60 text-slate-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-100'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                {v.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs">
        <span className="text-slate-500">{t('operations.classificationSelected')}: </span>
        <span className="font-bold text-slate-200">{selectedLabels}</span>
        <span className="mx-2 text-slate-600">·</span>
        <span className="text-slate-500">{t('operations.classificationPreview')}: </span>
        <span className="font-bold text-cyan-200/90">
          {formatOperationClassification(classificationPreview, modelLine)}
        </span>
      </div>
    </div>
  )
}
