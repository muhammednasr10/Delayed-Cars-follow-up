import { Layers3 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { FamilyVehicleCountRow } from '../../Utils/missingPartPageUtils'
import { Modal } from '../Modal'

type Props = {
  family: FamilyVehicleCountRow | null
  onClose: () => void
  onVariantClick?: (variantName: string) => void
}

export function MissingPartFamilyVariantsModal({ family, onClose, onVariantClick }: Props) {
  const { t } = useLang()
  if (!family) return null

  const interactive = Boolean(onVariantClick)

  return (
    <Modal
      open={Boolean(family)}
      title={t('mp.modelSummary.variantsTitle', { family: family.familyName })}
      subtitle={t('mp.modelSummary.variantsSubtitle', { n: family.count })}
      icon={<Layers3 className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {family.variants.map(row => {
          const body = (
            <>
              <p className="text-sm font-bold text-white">{row.model}</p>
              <p className="mt-1 text-lg font-black tabular-nums text-violet-200">{row.count}</p>
            </>
          )

          if (interactive) {
            return (
              <button
                key={row.model}
                type="button"
                onClick={() => onVariantClick?.(row.model)}
                className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-3 text-center transition hover:border-violet-400/50 hover:bg-violet-500/15"
                title={t('mp.familyCards.openVehicles')}
              >
                {body}
              </button>
            )
          }

          return (
            <div
              key={row.model}
              className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-3 py-3 text-center"
            >
              {body}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
