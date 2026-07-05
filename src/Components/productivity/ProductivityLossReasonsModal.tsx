import { AlertTriangle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { ProductivityDelayKind } from '../../Types/productivityDelayReason'

type Props = {
  open: boolean
  workDate: string
  kind: ProductivityDelayKind
  deficit: number
  reasons: string
  onClose: () => void
}

function kindLabel(t: (key: string) => string, kind: ProductivityDelayKind): string {
  if (kind === 'entry') return t('productionOrders.workDaysTab.cols.entryProductivity')
  if (kind === 'exit') return t('productionOrders.workDaysTab.cols.exitProductivity')
  return t('productionOrders.workDaysTab.cols.repairProductivity')
}

export function ProductivityLossReasonsModal({ open, workDate, kind, deficit, reasons, onClose }: Props) {
  const { t } = useLang()
  const trimmed = reasons.trim()

  return (
    <Modal
      open={open}
      title={t('productivity.lossReasonsTitle')}
      subtitle={`${kindLabel(t, kind)} · ${workDate} · ${t('productionOrders.workDaysTab.cols.deficitShort')}: ${deficit}`}
      icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      {trimmed ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{trimmed}</p>
      ) : (
        <p className="text-sm text-slate-500">{t('productivity.lossReasonsEmpty')}</p>
      )}
    </Modal>
  )
}
