import { useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { StopperChip } from '../StatusChips'
import type { BomItemDetail } from '../../Types/bom'
import type { StopperType } from '../../Types/enums'
import { effectiveBomStopperType } from '../../Utils/bomStopper'
import { BomStopperExclusionsModal } from './BomStopperExclusionsModal'

export function BomStopperCell({ row, compact }: { row: BomItemDetail; compact?: boolean }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const stopper = effectiveBomStopperType(row)

  if (stopper === 'non_stopper') {
    return <span className="text-slate-600">{t('bom.stopperNone')}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={`inline-flex ${compact ? 'scale-90' : ''}`}
        title={t('bom.stopperExclusionsClick')}
      >
        <StopperChip type={stopper as StopperType} />
      </button>
      <BomStopperExclusionsModal item={row} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
