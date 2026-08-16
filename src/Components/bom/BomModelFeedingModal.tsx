import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { BomIplLogisticsPanel } from './BomIplLogisticsPanel'
import { emptyIplFeedingCard, type BomIplFeedingCard } from '../../Utils/iplBomLogistics'

type Props = {
  open: boolean
  modelName: string
  value?: BomIplFeedingCard
  onClose: () => void
  onApply: (card: BomIplFeedingCard) => void
}

export function BomModelFeedingModal({ open, modelName, value, onClose, onApply }: Props) {
  const { t } = useLang()
  const [draft, setDraft] = useState<BomIplFeedingCard>(() => value ?? emptyIplFeedingCard())

  useEffect(() => {
    if (open) setDraft(value ?? emptyIplFeedingCard())
  }, [open, value])

  return (
    <Modal
      open={open}
      title={t('bom.iplLogistics.modalTitle')}
      subtitle={modelName}
      icon={<Package className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <BomIplLogisticsPanel canUpdate hideSave value={draft} onChange={setDraft} />
    </Modal>
  )
}
