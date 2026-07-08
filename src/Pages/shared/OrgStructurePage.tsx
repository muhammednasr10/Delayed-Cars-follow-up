import { useEffect, useMemo, useState } from 'react'
import { LayoutList, Network, Plus, Upload, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { useAssemblyWorkforceScope } from '../../hooks/useAssemblyWorkforceScope'
import { useEmployees } from '../../hooks/useEmployees'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import { createEmployee, endEmployeeEmployment, reactivateEmployee, suspendEmployee, updateEmployee } from '../../services/employeesService'
import { usePermissions } from '../../Context/PermissionsContext'
import { Modal } from '../../Components/Modal'
import { Field, inputCls } from '../../Components/FormField'
import { EmployeeFilters, emptyEmployeeFilters, type EmployeeFilterState } from '../../Components/EmployeeFilters'
import { EmployeeTable } from '../../Components/EmployeeTable'
import { EmployeeOrgChart } from '../../Components/EmployeeOrgChart'
import { EmployeeForm, type EmployeeFormSubmitResult } from '../../Components/EmployeeForm'
import { EmployeeImportModal } from '../../Components/EmployeeImportModal'
import { ExportableTable } from '../../Components/ExportableTable'
import type { Employee, EmployeeInput } from '../../Types/employee'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { WorkArea } from '../../Types/settings'
import { employeeMatchesOrgFilter } from '../../Utils/employeeOrgPicker'
import { assemblyOrgPath, filterAssemblyWorkforce } from '../../Utils/assemblyWorkforce'
import { isCurrentRosterEmployee, isFormerEmployee } from '../../Utils/employeeRoster'
import { getWorkAreas } from '../../services/settingsService'

type View = 'table' | 'chart'
export type WorkforceScope = 'all' | 'assembly'
export type RosterMode = 'current' | 'former'

export function OrgStructurePage({
  embedded = false,
  workforceScope = 'all',
  rosterMode = 'current'
}: {
  embedded?: boolean
  workforceScope?: WorkforceScope
  rosterMode?: RosterMode
}) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canCreate = hasRole('admin') || hasPermission('employees', 'create')
  const canUpdate = hasRole('admin') || hasPermission('employees', 'update')
  const canDelete = hasRole('admin') || hasPermission('employees', 'delete')
  const canManage = canCreate || canUpdate || canDelete

  const { employees, loading, error, reload } = useEmployees()
  const [areas, setAreas] = useState<WorkArea[]>([])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [view, setView] = useState<View>('table')
  const [filters, setFilters] = useState<EmployeeFilterState>(emptyEmployeeFilters)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<Employee | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [blockLinkedUser, setBlockLinkedUser] = useState(true)
  const [success, setSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    getWorkAreas().then(setAreas).catch(() => setAreas([]))
    getFactoryOrgUnits({ includeInactive: true }).then(setOrgUnits).catch(() => setOrgUnits([]))
  }, [])

  const isAssemblyScope = workforceScope === 'assembly'
  const isFormerRoster = rosterMode === 'former'
  const canCreateScoped = canCreate && !isAssemblyScope && !isFormerRoster
  const canManageScoped = canManage && !isAssemblyScope

  const assemblyBase = useMemo(
    () => (isAssemblyScope ? filterAssemblyWorkforce(employees, orgUnits) : employees),
    [employees, orgUnits, isAssemblyScope]
  )
  const { scopedEmployees: assemblyScoped, isScopedView, scopeLabel } = useAssemblyWorkforceScope(assemblyBase)
  const workforceEmployees = isAssemblyScope ? assemblyScoped : employees

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return workforceEmployees.filter(e => {
      if (isFormerRoster ? !isFormerEmployee(e) : !isCurrentRosterEmployee(e)) return false
      if (term && !e.fullName.toLowerCase().includes(term) && !e.employeeCode.toLowerCase().includes(term)) return false
      if (filters.role && e.jobRole !== filters.role) return false
      if (!employeeMatchesOrgFilter(e.factoryOrgUnitId, filters.factoryOrgUnitId, orgUnits)) return false
      if (filters.status === 'active' && !e.isActive) return false
      if (filters.status === 'inactive' && e.isActive) return false
      return true
    })
  }, [workforceEmployees, filters, orgUnits, isFormerRoster])

  function flash(msg: string) {
    setSuccess(msg)
    setActionError('')
    window.setTimeout(() => setSuccess(''), 2500)
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(e: Employee) {
    setEditing(e)
    setFormOpen(true)
  }

  async function submitForm(input: EmployeeInput): Promise<EmployeeFormSubmitResult> {
    setSaving(true)
    setActionError('')
    try {
      if (editing) await updateEmployee(editing.id, input)
      else await createEmployee(input)
      await reload()
      flash(editing ? t('settings.updated') : t('settings.added'))
      setFormOpen(false)
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE_CODE') {
        return { ok: false, fieldErrors: { employeeCode: t('org.err.duplicateCode') } }
      }
      if (msg === 'MANAGER_CYCLE') {
        setActionError(t('org.err.managerCycle'))
        return { ok: false }
      }
      setActionError(msg)
      return { ok: false }
    } finally {
      setSaving(false)
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return
    setSaving(true)
    setActionError('')
    try {
      if (toggleTarget.isActive && !isFormerEmployee(toggleTarget)) {
        if (!suspendReason.trim()) {
          setActionError(t('permissions.reasonRequired'))
          return
        }
        await suspendEmployee(toggleTarget.id, suspendReason.trim(), blockLinkedUser)
      } else {
        await reactivateEmployee(toggleTarget.id)
      }
      await reload()
      flash(t('settings.updated'))
      setToggleTarget(null)
      setSuspendReason('')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmLeave() {
    if (!leaveTarget) return
    setSaving(true)
    setActionError('')
    try {
      if (!leaveReason.trim()) {
        setActionError(t('permissions.reasonRequired'))
        return
      }
      await endEmployeeEmployment(leaveTarget.id, leaveReason.trim(), blockLinkedUser)
      await reload()
      flash(t('org.leaveWorkDone'))
      setLeaveTarget(null)
      setLeaveReason('')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className={embedded ? 'space-y-4' : 'card-industrial p-4 sm:p-5'}>
        {!embedded && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Users className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-black text-white">{t('org.title')}</h2>
                <p className="text-sm text-slate-400">
                  {isFormerRoster
                    ? t('org.formerSubtitle')
                    : isAssemblyScope
                      ? t('org.assemblySubtitle')
                      : !embedded
                        ? t('org.hrSubtitle')
                        : t('org.subtitle')}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${embedded ? '' : 'mt-0'}`}>
          <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
            <div className="flex rounded-xl bg-slate-800 p-1">
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${view === 'table' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}>
                <LayoutList className="h-4 w-4" /> {t('org.tableView')}
              </button>
              <button onClick={() => setView('chart')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${view === 'chart' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}>
                <Network className="h-4 w-4" /> {t('org.chartView')}
              </button>
            </div>
            {canCreateScoped && (
              <>
                <button onClick={() => setImportOpen(true)} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20">
                  <Upload className="mr-1 inline h-4 w-4" /> {t('org.import.btn')}
                </button>
                <button onClick={openAdd} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
                  <Plus className="mr-1 inline h-4 w-4" /> {t('org.add')}
                </button>
              </>
            )}
          </div>
        </div>

        {!embedded && !canManageScoped && !canUpdate && <p className="mt-3 text-xs text-amber-300">{t('org.noPerm')}</p>}
        {isAssemblyScope && (
          <p className={`text-xs text-cyan-200/90 ${embedded ? '' : 'mt-3'}`}>{t('org.assemblyWorkforceHint')}</p>
        )}
        {isAssemblyScope && isScopedView && (
          <p className={`text-xs text-cyan-200/80 ${embedded ? 'mt-2' : 'mt-2'}`}>
            {scopeLabel ? t('org.scopeBanner', { scope: scopeLabel }) : t('org.assemblySupervisorScopeHint')}
          </p>
        )}
        <div className={embedded ? '' : 'mt-4'}>
          <EmployeeFilters value={filters} onChange={setFilters} orgUnits={orgUnits} />
        </div>
      </div>

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {(actionError || error) && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError || error}</div>}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 text-sm text-slate-400">{t('org.count', { n: filtered.length })}</div>
        {view === 'table' && (
          <ExportableTable filename="employees" title={t('org.title')} rowCount={filtered.length}>
            <EmployeeTable
              employees={filtered}
              rosterVariant={isFormerRoster ? 'former' : 'current'}
              canEdit={canUpdate}
              canToggle={canUpdate || canDelete}
              canLeaveWork={(canUpdate || canDelete) && !isAssemblyScope}
              onEdit={openEdit}
              onToggleActive={setToggleTarget}
              onLeaveWork={setLeaveTarget}
            />
          </ExportableTable>
        )}
        {view === 'chart' && <EmployeeOrgChart employees={filtered} />}

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            {isFormerRoster ? t('org.formerEmpty') : t('org.empty')}
          </div>
        )}
      </div>

      <EmployeeForm
        open={formOpen}
        editing={editing}
        employees={workforceEmployees}
        orgUnits={orgUnits}
        defaultOrgPath={isAssemblyScope ? assemblyOrgPath(orgUnits) : undefined}
        busy={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
      />

      <EmployeeImportModal
        open={importOpen}
        employees={employees}
        areas={areas}
        busy={saving}
        onClose={() => setImportOpen(false)}
        onDone={n => {
          void reload()
          flash(t('org.import.done', { n }))
        }}
      />

      <Modal
        open={Boolean(toggleTarget)}
        title={
          toggleTarget && toggleTarget.isActive && !isFormerEmployee(toggleTarget)
            ? t('permissions.suspendEmployee')
            : t('permissions.reactivateEmployee')
        }
        onClose={() => setToggleTarget(null)}
        footer={
          <>
            <button onClick={() => setToggleTarget(null)} className="rounded-xl bg-slate-800 px-4 py-2 font-bold">
              {t('common.cancel')}
            </button>
            <button onClick={() => void confirmToggle()} disabled={saving} className="rounded-xl bg-cyan-500 px-4 py-2 font-black text-slate-950">
              {t('common.confirm')}
            </button>
          </>
        }
      >
        {toggleTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              {toggleTarget.fullName} — {toggleTarget.employeeCode}
            </p>
            {toggleTarget.isActive && !isFormerEmployee(toggleTarget) ? (
              <>
                <p className="text-amber-200">{t('permissions.suspendConfirm')}</p>
                <Field label={t('permissions.blockReason')} required>
                  <textarea className={inputCls()} rows={3} value={suspendReason} onChange={e => setSuspendReason(e.target.value)} />
                </Field>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={blockLinkedUser} onChange={e => setBlockLinkedUser(e.target.checked)} />
                  {t('permissions.blockLinkedUser')}
                </label>
              </>
            ) : (
              <p className="text-emerald-200">{t('permissions.reactivateConfirm')}</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(leaveTarget)}
        title={t('org.leaveWork')}
        onClose={() => {
          setLeaveTarget(null)
          setLeaveReason('')
        }}
        footer={
          <>
            <button
              onClick={() => {
                setLeaveTarget(null)
                setLeaveReason('')
              }}
              className="rounded-xl bg-slate-800 px-4 py-2 font-bold"
            >
              {t('common.cancel')}
            </button>
            <button onClick={() => void confirmLeave()} disabled={saving} className="rounded-xl bg-violet-500 px-4 py-2 font-black text-slate-950">
              {t('common.confirm')}
            </button>
          </>
        }
      >
        {leaveTarget && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              {leaveTarget.fullName} — {leaveTarget.employeeCode}
            </p>
            <p className="text-violet-200">{t('org.leaveWorkConfirm')}</p>
            <Field label={t('org.leaveWorkReason')} required>
              <textarea className={inputCls()} rows={3} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={blockLinkedUser} onChange={e => setBlockLinkedUser(e.target.checked)} />
              {t('permissions.blockLinkedUser')}
            </label>
          </div>
        )}
      </Modal>
    </section>
  )
}
