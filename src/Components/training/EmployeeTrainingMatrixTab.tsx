import { useMemo, useState } from 'react'
import { LayoutGrid, Pencil, Plus, PowerOff, Table2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { RatingBadge, TrainingLevelBadge, TrainingStatusBadge } from '../TrainingBadges'
import { MatrixGrid } from '../MatrixGrid'
import { EmployeeTrainingRecordForm } from '../EmployeeTrainingRecordForm'
import { EmptyState } from '../EmptyState'
import { createTrainingRecord, setTrainingRecordActive, updateTrainingRecord } from '../../services/trainingService'
import { TRAINING_LEVELS, TRAINING_STATUSES } from '../../Types/enums'
import type { TrainingLevel, TrainingStatus } from '../../Types/enums'
import type { Employee } from '../../Types/employee'
import type { EmployeeTraining, EmployeeTrainingInput, TrainingSkill } from '../../Types/training'

type Props = {
  employees: Employee[]
  skills: TrainingSkill[]
  records: EmployeeTraining[]
  canManage: boolean
  onChanged: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

type Filters = { search: string; skillId: string; level: TrainingLevel | ''; status: TrainingStatus | ''; expiry: '' | 'expired' | 'near' }

export function EmployeeTrainingMatrixTab({ employees, skills, records, canManage, onChanged, notify }: Props) {
  const { t } = useLang()
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [filters, setFilters] = useState<Filters>({ search: '', skillId: '', level: '', status: '', expiry: '' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeTraining | null>(null)
  const [preset, setPreset] = useState<{ employeeId?: string; skillId?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return records.filter(r => {
      if (term && !r.employeeName.toLowerCase().includes(term) && !r.employeeCode.toLowerCase().includes(term)) return false
      if (filters.skillId && r.skillId !== filters.skillId) return false
      if (filters.level && r.level !== filters.level) return false
      if (filters.status && r.effectiveStatus !== filters.status) return false
      if (filters.expiry === 'expired' && !r.isExpired) return false
      if (filters.expiry === 'near' && !r.isNearExpiry) return false
      return true
    })
  }, [records, filters])

  function openAdd() { setEditing(null); setPreset(null); setFormOpen(true) }
  function openEdit(r: EmployeeTraining) { setEditing(r); setPreset(null); setFormOpen(true) }
  function openCell(emp: Employee, skill: TrainingSkill, rec: EmployeeTraining | null) {
    if (rec) openEdit(rec)
    else { setEditing(null); setPreset({ employeeId: emp.id, skillId: skill.id }); setFormOpen(true) }
  }

  async function submit(input: EmployeeTrainingInput): Promise<boolean> {
    setBusy(true)
    try {
      if (editing) await updateTrainingRecord(editing.id, input)
      else await createTrainingRecord(input)
      await onChanged(); notify(t('settings.added')); setFormOpen(false); return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE') return false
      notify(msg, true); return false
    } finally { setBusy(false) }
  }

  async function suspend(r: EmployeeTraining) {
    setBusy(true)
    try { await setTrainingRecordActive(r.id, false); await onChanged(); notify(t('settings.updated')) }
    catch (e) { notify(e instanceof Error ? e.message : t('common.error'), true) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-800 p-1">
            <button onClick={() => setView('table')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${view === 'table' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}><Table2 className="h-4 w-4" /> {t('training.view.table')}</button>
            <button onClick={() => setView('grid')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${view === 'grid' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300'}`}><LayoutGrid className="h-4 w-4" /> {t('training.view.grid')}</button>
          </div>
          {canManage && (
            <button onClick={openAdd} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"><Plus className="mr-1 inline h-4 w-4" /> {t('training.addRecord')}</button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="input-dark" placeholder={t('training.filters.search')} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
          <select className="input-dark" value={filters.skillId} onChange={e => setFilters(p => ({ ...p, skillId: e.target.value }))}>
            <option value="">{t('training.filters.skill')}</option>
            {skills.map(s => <option key={s.id} value={s.id}>{s.skillCode}</option>)}
          </select>
          <select className="input-dark" value={filters.level} onChange={e => setFilters(p => ({ ...p, level: e.target.value as TrainingLevel | '' }))}>
            <option value="">{t('training.filters.level')}</option>
            {TRAINING_LEVELS.map(l => <option key={l} value={l}>{t(`trainingLevel.${l}`)}</option>)}
          </select>
          <select className="input-dark" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value as TrainingStatus | '' }))}>
            <option value="">{t('training.filters.status')}</option>
            {TRAINING_STATUSES.map(s => <option key={s} value={s}>{t(`trainingStatus.${s}`)}</option>)}
          </select>
          <select className="input-dark" value={filters.expiry} onChange={e => setFilters(p => ({ ...p, expiry: e.target.value as Filters['expiry'] }))}>
            <option value="">{t('training.filters.expiry')}</option>
            <option value="expired">{t('training.filters.expired')}</option>
            <option value="near">{t('training.filters.near')}</option>
          </select>
        </div>
      </div>

      <div className="card-industrial overflow-hidden">
        {view === 'grid' ? (
          <MatrixGrid employees={employees} skills={skills} records={records} canManage={canManage} onCell={openCell} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-start">
              <thead className="bg-slate-950/90">
                <tr>
                  {['employee', 'skill', 'level', 'rating', 'status', 'trainingDate', 'expiry', 'trainer'].map(c => (
                    <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`training.rec.${c}`)}</th>
                  ))}
                  {canManage && <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(r => (
                  <tr key={r.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                    <td className="table-cell"><span className="font-bold text-slate-100">{r.employeeName}</span><span className="block text-[10px] text-slate-500" dir="ltr">{r.employeeCode}</span></td>
                    <td className="table-cell text-slate-200">{r.skillName}</td>
                    <td className="table-cell"><TrainingLevelBadge level={r.level} /></td>
                    <td className="table-cell"><RatingBadge rating={r.rating} /></td>
                    <td className="table-cell"><TrainingStatusBadge status={r.effectiveStatus} /></td>
                    <td className="table-cell text-slate-400" dir="ltr">{r.trainingDate ?? '-'}</td>
                    <td className={`table-cell ${r.isExpired ? 'text-orange-300' : r.isNearExpiry ? 'text-yellow-300' : 'text-slate-400'}`} dir="ltr">{r.expiryDate ?? '-'}</td>
                    <td className="table-cell text-slate-400">{r.trainerName ?? '-'}</td>
                    {canManage && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => suspend(r)} title={t('training.deactivate')} className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"><PowerOff className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState title={t('training.empty')} hint={canManage ? t('training.emptyHint') : undefined} />}
          </div>
        )}
      </div>

      <EmployeeTrainingRecordForm open={formOpen} editing={editing} preset={preset} employees={employees} skills={skills} busy={busy} onClose={() => setFormOpen(false)} onSubmit={submit} />
    </div>
  )
}
