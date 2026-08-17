import type { ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { MpLookupAutocomplete } from '../MpLookupAutocomplete'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  department: string
  reason: string
  orgUnits: FactoryOrgUnit[]
  reasons: MpLookupOption[]
  onDepartmentChange: (department: string) => void
  onReasonChange: (reason: string) => void
  onCreateReason: (labelAr: string) => Promise<MpLookupOption>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-bold text-slate-400">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </div>
  )
}

export function MpIssueLookupsFields({
  department,
  reason,
  orgUnits,
  reasons,
  onDepartmentChange,
  onReasonChange,
  onCreateReason
}: Props) {
  const { t } = useLang()
  const pickerReasons = reasons.filter(r => r.isActive || r.code === reason)

  return (
    <div className="space-y-3">
      <Field label={t('mp.cols.reasonClass')} required>
        <MpLookupAutocomplete
          options={pickerReasons}
          value={reason}
          onChange={onReasonChange}
          onCreate={onCreateReason}
          placeholder={t('mp.searchReasonClass')}
          addLabel={t('mp.addReasonOption')}
        />
      </Field>
      <Field label={t('mp.cols.causingDepartment')} required>
        <OrgUnitCascadeField
          units={orgUnits}
          value={department}
          onChange={onDepartmentChange}
          allowEmpty={false}
        />
      </Field>
    </div>
  )
}
