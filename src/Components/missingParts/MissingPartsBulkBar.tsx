import { CheckCircle2, PackageCheck, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import type { Employee } from '../../Types/employee'
import type { MpFollowUpAssignment } from '../../Types/mpVehicleActions'
import { MpIssueFollowUpButton } from './MpIssueFollowUpButton'

type Props = {
  selectedCount: number
  listTab: 'active' | 'history'
  canBulkInstall: boolean
  canComplete: boolean
  canAssignFollowUp: boolean
  canDelete: boolean
  bulkActionBusy: boolean
  completingVehicleId: string | null
  employees: Employee[]
  onInstall: () => void
  onComplete: () => void
  onFollowUp: (assignment: MpFollowUpAssignment) => void
  onDelete: () => void
  onClear: () => void
}

export function MissingPartsBulkBar({
  selectedCount,
  listTab,
  canBulkInstall,
  canComplete,
  canAssignFollowUp,
  canDelete,
  bulkActionBusy,
  completingVehicleId,
  employees,
  onInstall,
  onComplete,
  onFollowUp,
  onDelete,
  onClear
}: Props) {
  const { t } = useLang()

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
      <span className="text-sm font-bold text-slate-300">{t('mp.bulk.selected', { n: selectedCount })}</span>
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
      {listTab === 'active' && canAssignFollowUp && (
        <MpIssueFollowUpButton
          assignment={{ completingDepartment: '', followUpEmployeeId: '' }}
          employees={employees}
          title={t('mp.followUp.bulk')}
          label={t('mp.followUp.bulk')}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-black text-cyan-200 hover:bg-slate-700 disabled:opacity-50"
          iconClassName="h-4 w-4"
          onSave={onFollowUp}
        />
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
