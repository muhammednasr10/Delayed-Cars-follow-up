import { useLang } from '../../i18n/LanguageContext'
import type { VehicleModel } from '../../Types/settings'
import { MissionChassisFields } from './MissionChassisFields'
import { MissionModelFields } from './MissionModelFields'

type Props = {
  models: VehicleModel[]
  parentModelId: string | null
  variantModelId: string | null
  vehicleCount: number | null
  chassisNumbers: string[]
  saving?: boolean
  onParentChange: (parentModelId: string | null) => void
  onVariantChange: (variantModelId: string | null) => void
  onChassisChange: (vehicleCount: number | null, chassisNumbers: string[]) => void
}

export function MissionReplyConfirm({
  models,
  parentModelId,
  variantModelId,
  vehicleCount,
  chassisNumbers,
  saving,
  onParentChange,
  onVariantChange,
  onChassisChange
}: Props) {
  const { t } = useLang()

  return (
    <fieldset disabled={saving} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs font-black text-cyan-200">{t('missions.respond.confirmTitle')}</p>
      <p className="text-xs text-slate-400">{t('missions.respond.confirmEditHint')}</p>
      <MissionModelFields
        models={models}
        parentModelId={parentModelId}
        variantModelId={variantModelId}
        onParentChange={onParentChange}
        onVariantChange={onVariantChange}
      />
      <MissionChassisFields
        vehicleCount={vehicleCount}
        chassisNumbers={chassisNumbers}
        countLabel={t('missions.respond.confirmQty')}
        onChange={onChassisChange}
      />
    </fieldset>
  )
}
