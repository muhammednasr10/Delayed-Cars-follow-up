import { useEffect, useMemo, useState } from 'react'
import { UserCog } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { Modal } from '../Modal'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import type { Employee } from '../../Types/employee'
import type { MpFollowUpAssignment } from '../../Types/mpVehicleActions'

type Props = {
  assignment: MpFollowUpAssignment
  employees: Employee[]
  onSave: (next: MpFollowUpAssignment) => void
  className?: string
  iconClassName?: string
  title?: string
  label?: string
}

export function MpIssueFollowUpButton({
  assignment,
  employees,
  onSave,
  className,
  iconClassName,
  title,
  label
}: Props) {
  const { t } = useLang()
  const { orgUnits } = useMpLookups()
  const [open, setOpen] = useState(false)
  const [completingDepartment, setCompletingDepartment] = useState(assignment.completingDepartment)
  const [followUpEmployeeId, setFollowUpEmployeeId] = useState(assignment.followUpEmployeeId)
  const filled = Boolean(assignment.completingDepartment || assignment.followUpEmployeeId)
  const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees])

  useEffect(() => {
    if (!open) return
    setCompletingDepartment(assignment.completingDepartment)
    setFollowUpEmployeeId(assignment.followUpEmployeeId)
  }, [open, assignment.completingDepartment, assignment.followUpEmployeeId])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title ?? t('mp.followUp.open')}
        className={
          className ??
          `rounded-lg p-1.5 hover:bg-cyan-500/20 ${filled ? 'bg-cyan-500/15 text-cyan-200' : 'text-cyan-300'}`
        }
      >
        <UserCog className={iconClassName ?? 'h-3.5 w-3.5'} />
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('mp.followUp.title')}
        icon={<UserCog className="h-5 w-5" />}
        maxWidthClass="max-w-lg"
        zIndexClass="z-[220]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSave({ completingDepartment, followUpEmployeeId })
                setOpen(false)
              }}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 hover:bg-cyan-400"
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t('mp.followUp.hint')}</p>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400">{t('mp.cols.completingDepartment')}</p>
            <OrgUnitCascadeField
              units={orgUnits}
              value={completingDepartment}
              onChange={setCompletingDepartment}
              emptyLabel={t('mp.followUp.noDepartment')}
            />
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('mp.cols.followUpEmployee')}</span>
            <EmployeeAutocomplete
              employees={activeEmployees}
              value={followUpEmployeeId}
              onChange={setFollowUpEmployeeId}
              activeOnly
              allowUnknown
              unknownLabel={t('mp.followUp.noEmployee')}
              placeholder={t('mp.followUp.searchEmployee')}
            />
          </label>
        </div>
      </Modal>
    </>
  )
}
