import { useState } from 'react'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ActiveBadge } from '../EmployeeBadges'
import { TrainingSkillForm } from '../TrainingSkillForm'
import { EmptyState } from '../EmptyState'
import { createSkill, setSkillActive, updateSkill } from '../../services/trainingService'
import type { TrainingSkill, TrainingSkillInput } from '../../Types/training'
import type { Station } from '../../Types/settings'

type Props = {
  skills: TrainingSkill[]
  stations: Station[]
  canManage: boolean
  onChanged: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

export function TrainingSkillsTab({ skills, stations, canManage, onChanged, notify }: Props) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingSkill | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(input: TrainingSkillInput): Promise<boolean> {
    setBusy(true)
    try {
      if (editing) await updateSkill(editing.id, input)
      else await createSkill(input)
      await onChanged()
      notify(t('settings.added'))
      setFormOpen(false)
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE') return false
      notify(msg, true)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function toggle(s: TrainingSkill) {
    setBusy(true)
    try { await setSkillActive(s.id, !s.isActive); await onChanged() }
    catch (e) { notify(e instanceof Error ? e.message : t('common.error'), true) }
    finally { setBusy(false) }
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <span className="text-sm text-slate-400">{t('training.count', { n: skills.length })}</span>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true) }} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
            <Plus className="mr-1 inline h-4 w-4" /> {t('training.addSkill')}
          </button>
        )}
      </div>
      {skills.length === 0 ? (
        <EmptyState title={t('training.empty')} hint={canManage ? t('training.emptyHint') : undefined} />
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-start">
          <thead className="bg-slate-950/90">
            <tr>
              {['code', 'nameAr', 'department', 'station', 'manpower', 'mandatory', 'status'].map(c => (
                <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`training.skill.${c}`)}</th>
              ))}
              {canManage && <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {skills.map(s => (
              <tr key={s.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                <td className="table-cell font-black text-white" dir="ltr">{s.skillCode}</td>
                <td className="table-cell font-bold text-slate-100">
                  {s.skillNameAr || s.skillNameEn}
                  {s.isCritical && <span className="ml-2 inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300 ring-1 ring-red-400/30">{t('training.skill.critical')}</span>}
                </td>
                <td className="table-cell text-slate-300">{s.department ? t(`department.${s.department}`) : '-'}</td>
                <td className="table-cell text-slate-300">{stations.find(st => st.id === s.stationId)?.station_number ?? '-'}</td>
                <td className="table-cell text-slate-300">{s.requiredManpowerCount}</td>
                <td className="table-cell text-slate-300">{s.isMandatory ? t('common.yes') : t('common.no')}</td>
                <td className="table-cell"><ActiveBadge active={s.isActive} /></td>
                {canManage && (
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(s); setFormOpen(true) }} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggle(s)} className={`rounded-lg p-2 ${s.isActive ? 'bg-red-500/15 text-red-200' : 'bg-emerald-500/15 text-emerald-200'}`}>{s.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <TrainingSkillForm open={formOpen} editing={editing} stations={stations} busy={busy} onClose={() => setFormOpen(false)} onSubmit={submit} />
    </div>
  )
}
