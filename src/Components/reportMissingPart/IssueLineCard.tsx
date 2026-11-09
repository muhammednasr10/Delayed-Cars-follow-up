import { Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { MpIssueLookupsFields } from '../missingParts/MpIssueLookupsFields'
import { ReasonItemsField } from './ReasonItemsField'
import type { IssueLineDraft } from './types'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MpLookupOption } from '../../Types/mpLookup'

export function IssueLineCard({
  line,
  index,
  issueCount,
  stockShortage,
  orgUnits,
  reasons,
  onPatchIssue,
  onPatchIssueReason,
  onUpdatePartItem,
  onAddPartItem,
  onRemovePartItem,
  onRemoveIssue,
  onCreateReason
}: {
  line: IssueLineDraft
  index: number
  issueCount: number
  stockShortage: boolean
  orgUnits: FactoryOrgUnit[]
  reasons: MpLookupOption[]
  onPatchIssue: (key: string, patch: Partial<IssueLineDraft>) => void
  onPatchIssueReason: (key: string, code: string) => void
  onUpdatePartItem: (key: string, index: number, value: string) => void
  onAddPartItem: (key: string) => void
  onRemovePartItem: (key: string, index: number) => void
  onRemoveIssue: (key: string) => void
  onCreateReason: (label: string) => Promise<MpLookupOption>
}) {
  const { t } = useLang()

  return (
    <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-cyan-400/80">{t('mp.issueN', { n: index + 1 })}</p>
        <button
          type="button"
          disabled={issueCount <= 1}
          onClick={() => onRemoveIssue(line.key)}
          className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25 disabled:opacity-30"
          title={t('common.delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <MpIssueLookupsFields
        layout="row"
        department={line.department}
        reason={line.reason}
        completingDepartment={line.completingDepartment ?? ''}
        orgUnits={orgUnits}
        reasons={reasons}
        showCompletingDepartment
        showFollowUpEmployees={false}
        onDepartmentChange={department => onPatchIssue(line.key, { department })}
        onReasonChange={code => onPatchIssueReason(line.key, code)}
        onCompletingDepartmentChange={completingDepartment =>
          onPatchIssue(line.key, { completingDepartment: completingDepartment || null })
        }
        onCreateReason={onCreateReason}
        leading={
          <ReasonItemsField
            compact
            line={line}
            stockShortage={stockShortage}
            onUpdate={(i, value) => onUpdatePartItem(line.key, i, value)}
            onAdd={() => onAddPartItem(line.key)}
            onRemove={i => onRemovePartItem(line.key, i)}
          />
        }
      />
    </div>
  )
}
