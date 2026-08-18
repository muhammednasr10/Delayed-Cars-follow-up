import { useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { VehicleModel } from '../../Types/settings'
import {
  buildFamilyVehicleCounts,
  buildVariantVehicleSummaries,
  type FamilyVehicleCountRow
} from '../../Utils/missingPartPageUtils'
import { getVehicleModels } from '../../services/settingsService'
import { MissingPartFamilyVariantsModal } from './MissingPartFamilyVariantsModal'
import { MissingPartVariantVehiclesModal } from './MissingPartVariantVehiclesModal'
import type { ShortageMissionAssignInput } from './MpAssignShortageMissionButton'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  loading?: boolean
  canUpdateStatus?: boolean
  canNotes?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canComplete?: boolean
  noteCounts?: Record<string, number>
  completingVehicleId?: string | null
  onOpenNotes?: (part: MissingPartDetail) => void
  onOpenDetail?: (part: MissingPartDetail) => void
  onEdit?: (part: MissingPartDetail) => void
  onUpdate?: (part: MissingPartDetail) => void
  onDeleteParts?: (parts: MissingPartDetail[]) => void
  onComplete?: (part: MissingPartDetail) => void
  onAssignFollowUp?: (
    part: MissingPartDetail,
    assignment: { completingDepartment: string; followUpEmployeeId: string }
  ) => void
  onAssignShortageMission?: (part: MissingPartDetail, input: ShortageMissionAssignInput) => void | Promise<void>
  assignMissionBusy?: boolean
}

export function MissingPartsFamilyCardsTab({
  items,
  reasons,
  departments,
  loading,
  canUpdateStatus,
  canNotes,
  canEdit,
  canDelete,
  canComplete,
  noteCounts = {},
  completingVehicleId,
  onOpenNotes,
  onOpenDetail,
  onEdit,
  onUpdate,
  onDeleteParts,
  onComplete,
  onAssignFollowUp,
  onAssignShortageMission,
  assignMissionBusy
}: Props) {
  const { t } = useLang()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [selectedFamily, setSelectedFamily] = useState<FamilyVehicleCountRow | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<{ name: string; familyName: string } | null>(null)

  useEffect(() => {
    getVehicleModels()
      .then(setModels)
      .catch(() => setModels([]))
  }, [])

  const summary = useMemo(() => buildFamilyVehicleCounts(items, models), [items, models])

  const variantVehicles = useMemo(() => {
    if (!selectedVariant) return []
    return buildVariantVehicleSummaries(items, selectedVariant.name)
  }, [items, selectedVariant])

  if (loading) {
    return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (summary.total === 0) {
    return <div className="p-8 text-center text-slate-400">{t('common.noResults')}</div>
  }

  return (
    <>
      <div className="p-4 sm:p-5">
        <p className="mb-4 text-xs text-slate-500">{t('mp.familyCards.hint')}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {summary.byFamily.map(family => (
            <button
              key={family.familyId}
              type="button"
              onClick={() => setSelectedFamily(family)}
              className="group rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/10 to-slate-950/40 p-4 text-center transition hover:border-cyan-400/50 hover:from-cyan-500/20"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 group-hover:bg-cyan-500/25">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-base font-black text-white">{family.familyName}</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-cyan-200">{family.count}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{t('mp.familyCards.vehicles')}</p>
            </button>
          ))}
        </div>
      </div>

      <MissingPartFamilyVariantsModal
        family={selectedFamily}
        onClose={() => setSelectedFamily(null)}
        onVariantClick={variantName => {
          if (!selectedFamily) return
          setSelectedVariant({ name: variantName, familyName: selectedFamily.familyName })
          setSelectedFamily(null)
        }}
      />

      <MissingPartVariantVehiclesModal
        variantName={selectedVariant?.name ?? null}
        familyName={selectedVariant?.familyName}
        vehicles={variantVehicles}
        reasons={reasons}
        departments={departments}
        onClose={() => setSelectedVariant(null)}
        allItems={items}
        canUpdateStatus={canUpdateStatus}
        canNotes={canNotes}
        canEdit={canEdit}
        canDelete={canDelete}
        canComplete={canComplete}
        noteCounts={noteCounts}
        completingVehicleId={completingVehicleId}
        onOpenNotes={onOpenNotes}
        onOpenDetail={onOpenDetail}
        onEdit={onEdit}
        onUpdate={onUpdate}
        onDeleteParts={onDeleteParts}
        onComplete={onComplete}
        onAssignFollowUp={onAssignFollowUp}
        onAssignShortageMission={onAssignShortageMission}
        assignMissionBusy={assignMissionBusy}
      />
    </>
  )
}
