import type { ReactNode } from 'react'
import { useLang } from '../../../i18n/LanguageContext'
import { EmptyState } from '../../EmptyState'

type Props = {
  loading: boolean
  isEmpty: boolean
  emptyTitle: string
  children: ReactNode
}

export function WarehouseEquipmentListCard({ loading, isEmpty, emptyTitle, children }: Props) {
  const { t } = useLang()

  return (
    <div className="card-industrial overflow-hidden">
      {loading ? (
        <p className="p-6 text-sm text-slate-400">{t('common.loading')}</p>
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} />
      ) : (
        children
      )}
    </div>
  )
}
