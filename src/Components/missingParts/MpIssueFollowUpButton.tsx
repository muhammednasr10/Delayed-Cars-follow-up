import { useEffect, useMemo, useState } from 'react'
import { UserCog, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useMpLookups } from '../../hooks/useMpLookups'
import { Modal } from '../Modal'
import { OrgUnitCascadeField } from '../OrgUnitCascadeField'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import type { Employee } from '../../Types/employee'
import type { MpFollowUpAssignment } from '../../Types/mpVehicleActions'
import { employeeLookupLabel } from '../../Utils/employeeLookup'

type Props = {
  assignment: MpFollowUpAssignment
  employees: Employee[]
  onSave: (next: MpFollowUpAssignment) => void
  className?: string
  iconClassName?: string
  title?: string
  label?: string
  /** When false, only the follow-up employee can be changed (department stays as-is). */
  showCompletingDepartment?: boolean
}

export function MpIssueFollowUpButton({
  assignment,
  employees,
  onSave,
  className,
  iconClassName,
  title,
  label,
  showCompletingDepartment = true
}: Props) {
  const { t } = useLang()
  const { orgUnits } = useMpLookups()
  const [open, setOpen] = useState(false)
  const [completingDepartment, setCompletingDepartment] = useState(assignment.completingDepartment)
  const [selectedIds, setSelectedIds] = useState<string[]>(assignment.followUpEmployeeIds ?? (assignment.followUpEmployeeId ? [assignment.followUpEmployeeId] : []))
  const [addingId, setAddingId] = useState('')

  const filled = showCompletingDepartment
    ? Boolean(assignment.completingDepartment || (assignment.followUpEmployeeIds?.length ?? 0) > 0 || assignment.followUpEmployeeId)
    : (assignment.followUpEmployeeIds?.length ?? 0) > 0 || Boolean(assignment.followUpEmployeeId)
  const activeEmployees = useMemo(() => employees.filter(e => e.isActive), [employees])
  const availableEmployees = useMemo(
    () => activeEmployees.filter(e => !selectedIds.includes(e.id)),
    [activeEmployees, selectedIds]
  )

  useEffect(() => {
    if (!open) return
    setCompletingDepartment(assignment.completingDepartment)
    setSelectedIds(assignment.followUpEmployeeIds ?? (assignment.followUpEmployeeId ? [assignment.followUpEmployeeId] : []))
    setAddingId('')
  }, [open, assignment.completingDepartment, assignment.followUpEmployeeId, assignment.followUpEmployeeIds])

  function addEmployee(id: string) {
    if (!id || selectedIds.includes(id)) return
    setSelectedIds(prev => [...prev, id])
    setAddingId('')
  }

  function removeEmployee(id: string) {
    setSelectedIds(prev => prev.filter(x => x !== id))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title ?? (showCompletingDepartment ? t('mp.followUp.open') : t('mp.followUp.openEmployee'))}
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
        title={showCompletingDepartment ? t('mp.followUp.title') : t('mp.followUp.titleEmployee')}
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
                onSave({
                  completingDepartment: showCompletingDepartment
                    ? completingDepartment
                    : assignment.completingDepartment,
                  followUpEmployeeId: selectedIds[0] || '',
                  followUpEmployeeIds: selectedIds
                })
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
          <p className="text-sm text-slate-400">
            {showCompletingDepartment ? t('mp.followUp.hint') : t('mp.followUp.hintEmployee')}
          </p>
          {showCompletingDepartment && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400">{t('mp.cols.completingDepartment')}</p>
              <OrgUnitCascadeField
                units={orgUnits}
                value={completingDepartment}
                onChange={setCompletingDepartment}
                emptyLabel={t('mp.followUp.noDepartment')}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">{t('mp.cols.followUpEmployee')}</span>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map(id => {
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
              value={addingId}
              onChange={addEmployee}
              activeOnly
              allowUnknown
              unknownLabel={t('mp.followUp.noEmployee')}
              placeholder={t('mp.followUp.addEmployee')}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
