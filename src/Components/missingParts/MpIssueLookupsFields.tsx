import { type ReactNode, useMemo } from 'react'
import { X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { MpLookupAutocomplete } from '../MpLookupAutocomplete'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Employee } from '../../Types/employee'
import { employeeLookupLabel } from '../../Utils/employeeLookup'

type Props = {
  department: string
  reason: string
  completingDepartment?: string
  orgUnits: FactoryOrgUnit[]
  reasons: MpLookupOption[]
  onDepartmentChange: (department: string) => void
  onReasonChange: (reason: string) => void
  onCompletingDepartmentChange?: (completingDepartment: string) => void
  onCreateReason: (labelAr: string) => Promise<MpLookupOption>
  showCompletingDepartment?: boolean
  followUpEmployeeIds?: string[]
  employees?: Employee[]
  onFollowUpEmployeeIdsChange?: (ids: string[]) => void
  showFollowUpEmployees?: boolean
  /** Stack (default) or single horizontal row for department fields. */
  layout?: 'stack' | 'row'
  /** Optional leading cell (e.g. reason text) when layout is row. */
  leading?: ReactNode
}

function Field({
  label,
  required,
  children,
  className
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`block space-y-1 ${className ?? ''}`}>
      <span className="text-[11px] font-bold text-slate-400">
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
  completingDepartment = '',
  orgUnits,
  reasons,
  onDepartmentChange,
  onReasonChange,
  onCompletingDepartmentChange,
  onCreateReason,
  showCompletingDepartment = false,
  followUpEmployeeIds = [],
  employees = [],
  onFollowUpEmployeeIdsChange,
  showFollowUpEmployees = false,
  layout = 'stack',
  leading
}: Props) {
  const { t } = useLang()
  const pickerReasons = reasons.filter(r => r.isActive || r.code === reason)
  const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees])
  const availableEmployees = useMemo(
    () => activeEmployees.filter(e => !followUpEmployeeIds.includes(e.id)),
    [activeEmployees, followUpEmployeeIds]
  )

  function addEmployee(id: string) {
    if (!id || followUpEmployeeIds.includes(id)) return
    onFollowUpEmployeeIdsChange?.([...followUpEmployeeIds, id])
  }

  function removeEmployee(id: string) {
    onFollowUpEmployeeIdsChange?.(followUpEmployeeIds.filter(x => x !== id))
  }

  const causing = (
    <Field label={t('mp.cols.causingDepartment')} required>
      <OrgUnitCascadeField
        units={orgUnits}
        value={department}
        onChange={onDepartmentChange}
        allowEmpty={false}
        administrationsOnly
      />
    </Field>
  )

  const reasonClass = (
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
  )

  const completing =
    showCompletingDepartment && onCompletingDepartmentChange ? (
      <Field label={t('mp.cols.completingDepartment')}>
        <OrgUnitCascadeField
          units={orgUnits}
          value={completingDepartment}
          onChange={onCompletingDepartmentChange}
          emptyLabel={t('mp.followUp.noDepartment')}
          administrationsOnly
        />
      </Field>
    ) : null

  const followUp =
    showFollowUpEmployees && onFollowUpEmployeeIdsChange ? (
      <Field label={t('mp.cols.followUpEmployee')}>
        {followUpEmployeeIds.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {followUpEmployeeIds.map(id => {
              const emp = employees.find(e => e.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-bold text-cyan-200"
                >
                  {emp ? employeeLookupLabel(emp) : id}
                  <button
                    type="button"
                    onClick={() => removeEmployee(id)}
                    className="rounded p-0.5 hover:bg-cyan-500/30"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}
        <EmployeeAutocomplete
          employees={availableEmployees}
          value=""
          onChange={addEmployee}
          activeOnly
          allowUnknown
          unknownLabel={t('mp.followUp.noEmployee')}
          placeholder={t('mp.followUp.addEmployee')}
        />
      </Field>
    ) : null

  if (layout === 'row') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {leading}
          {causing}
          {reasonClass}
          {completing}
        </div>
        {followUp}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {causing}
      {reasonClass}
      {completing}
      {followUp}
    </div>
  )
}
