import { CheckCircle2, GitMerge, PackageCheck, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'

type Props = {
  selectedCount: number
  listTab: 'active' | 'history'
  canBulkInstall: boolean
  canComplete: boolean
  canDelete: boolean
  canMerge: boolean
  bulkActionBusy: boolean
  completingVehicleId: string | null
  onInstall: () => void
  onComplete: () => void
  onDelete: () => void
  onMerge: () => void
  onClear: () => void
}

export function MissingPartsBulkBar({
  selectedCount,
  listTab,
  canBulkInstall,
  canComplete,
  canDelete,
  canMerge,
  bulkActionBusy,
  completingVehicleId,
  onInstall,
  onComplete,
  onDelete,
  onMerge,
  onClear
}: Props) {
  const { t } = useLang()

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
      <span className="text-sm font-bold text-slate-300">{t('mp.bulk.selected', { n: selectedCount })}</span>
      {listTab === 'active' && canMerge && selectedCount >= 2 && (
        <button
          type="button"
          disabled={bulkActionBusy}
          onClick={onMerge}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
          title={t('mp.bulk.merge.hint')}
        >
          <GitMerge className="h-4 w-4" />
          {t('mp.bulk.merge.action')}
        </button>
      )}
      {listTab === 'active' && canBulkInstall && (
        <button
          type="button"
          disabled={bulkActionBusy}
          onClick={onInstall}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <PackageCheck className="h-4 w-4" />
          {t('mp.bulk.installSelected')}
        </button>
      )}
      {listTab === 'active' && canComplete && (
        <button
          type="button"
          disabled={bulkActionBusy || Boolean(completingVehicleId)}
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('mp.bulk.completeSelected')}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={bulkActionBusy}
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t('mp.bulk.deleteSelected')}
        </button>
      )}
      <button
        type="button"
        disabled={bulkActionBusy}
        onClick={onClear}
        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
      >
        {t('mp.bulk.clearSelection')}
      </button>
    </div>
  )
}
