import { useEffect, useMemo, useState } from 'react'
import { LayoutList, Network, Plus, Upload, Users } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth } from '../../Context/AuthContext'
import { useEmployees } from '../../hooks/useEmployees'
import { getStations, getWorkAreas } from '../../services/settingsService'
import { createEmployee, reactivateEmployee, suspendEmployee, updateEmployee } from '../../services/employeesService'
import { usePermissions } from '../../Context/PermissionsContext'
import { Modal } from '../../Components/Modal'
import { Field, inputCls } from '../../Components/FormField'
import { EmployeeFilters, emptyEmployeeFilters, type EmployeeFilterState } from '../../Components/EmployeeFilters'
import { EmployeeTable } from '../../Components/EmployeeTable'
import { EmployeeOrgChart } from '../../Components/EmployeeOrgChart'
import { EmployeeForm } from '../../Components/EmployeeForm'
import { EmployeeImportModal } from '../../Components/EmployeeImportModal'
import type { Employee, EmployeeInput } from '../../Types/employee'
import type { Station, WorkArea } from '../../Types/settings'
import { workAreasFromStations } from '../../Utils/workAreasFromStations'

type View = 'table' | 'chart'

export function OrgStructurePage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const { hasPermission } = usePermissions()
  const canCreate = hasRole('admin') || hasPermission('employees', 'create')
  const canUpdate = hasRole('admin') || hasPermission('employees', 'update')
  const canDelete = hasRole('admin') || hasPermission('employees', 'delete')
  const canManage = canCreate || canUpdate || canDelete

  const { employees, loading, error, reload } = useEmployees()
  const [areas, setAreas] = useState<WorkArea[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [view, setView] = useState<View>('table')
  const [filters, setFilters] = useState<EmployeeFilterState>(emptyEmployeeFilters)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<Employee | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [blockLinkedUser, setBlockLinkedUser] = useState(true)
  const [success, setSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    getWorkAreas().then(setAreas).catch(() => setAreas([]))
    getStations().then(setStations).catch(() => setStations([]))
  }, [])

  const stationWorkAreas = useMemo(
    () => workAreasFromStations(stations, areas),
    [stations, areas]
  )

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return employees.filter(e => {
      if (term && !e.fullName.toLowerCase().includes(term) && !e.employeeCode.toLowerCase().includes(term)) return false
      if (filters.role && e.jobRole !== filters.role) return false
      if (filters.department && e.department !== filters.department) return false
      if (filters.workAreaId && e.workAreaId !== filters.workAreaId) return false
      if (filters.status === 'active' && !e.isActive) return false
      if (filters.status === 'inactive' && e.isActive) return false
      return true
    })
  }, [employees, filters])

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

  async function submitForm(input: EmployeeInput): Promise<boolean> {
    setSaving(true)
    setActionError('')
    try {
      if (editing) await updateEmployee(editing.id, input)
      else await createEmployee(input)
      await reload()
      flash(editing ? t('settings.updated') : t('settings.added'))
      setFormOpen(false)
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE_CODE') {
        setActionError(t('org.err.duplicateCode'))
        return false
      }
      if (msg === 'MANAGER_CYCLE') {
        setActionError(t('org.err.managerCycle'))
        return false
      }
      setActionError(msg)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function confirmToggle() {
    if (!toggleTarget) return
    setSaving(true)
    try {
      if (toggleTarget.isActive || toggleTarget.employmentStatus === 'active') {
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

  return (
    <section className="space-y-5">
      <div className={embedded ? 'space-y-4' : 'card-industrial p-4 sm:p-5'}>
        {!embedded && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Users className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-black text-white">{t('org.title')}</h2>
                <p className="text-sm text-slate-400">{t('org.subtitle')}</p>
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
            {canCreate && (
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

        {!embedded && !canManage && <p className="mt-3 text-xs text-amber-300">{t('org.noPerm')}</p>}
        <div className={embedded ? '' : 'mt-4'}>
          <EmployeeFilters value={filters} onChange={setFilters} areas={stationWorkAreas} />
        </div>
      </div>

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {(actionError || error) && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError || error}</div>}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 text-sm text-slate-400">{t('org.count', { n: filtered.length })}</div>
        {view === 'table' && (
          <EmployeeTable employees={filtered} canEdit={canUpdate} canToggle={canUpdate || canDelete} onEdit={openEdit} onToggleActive={setToggleTarget} />
        )}
        {view === 'chart' && <EmployeeOrgChart employees={filtered} />}

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">{t('org.empty')}</div>
        )}
      </div>

      <EmployeeForm
        open={formOpen}
        editing={editing}
        employees={employees}
        areas={areas}
        stations={stations}
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
        title={toggleTarget?.isActive ? t('permissions.suspendEmployee') : t('permissions.reactivateEmployee')}
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
            {toggleTarget.isActive ? (
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
    </section>
  )
}
