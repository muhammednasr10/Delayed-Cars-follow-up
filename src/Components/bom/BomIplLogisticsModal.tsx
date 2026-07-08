import { Package } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { BomIplLogisticsPanel } from './BomIplLogisticsPanel'
import type { BomDisplayGroup } from '../../Utils/bomRowGroups'
import type { BomIplFeedingCard } from '../../Utils/iplBomLogistics'

type Props = {
  open: boolean
  group: BomDisplayGroup | null
  canUpdate: boolean
  saving?: boolean
  onClose: () => void
  onSave: (itemIds: string[], card: BomIplFeedingCard) => Promise<void>
}

export function BomIplLogisticsModal({ open, group, canUpdate, saving, onClose, onSave }: Props) {
  const { t } = useLang()
  if (!group) return null

  const subtitle = [group.summary.part_name_ar, group.summary.part_name_en].filter(Boolean).join(' · ')

  return (
    <Modal
      open={open}
      title={t('bom.iplLogistics.modalTitle')}
      subtitle={subtitle || group.summary.part_number}
      icon={<Package className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <BomIplLogisticsPanel
        group={group}
        canUpdate={canUpdate}
        saving={saving}
        onSave={async (ids, card) => {
          await onSave(ids, card)
          onClose()
        }}
      />
    </Modal>
  )
}
