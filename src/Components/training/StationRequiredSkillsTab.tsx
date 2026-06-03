import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ActiveBadge } from '../EmployeeBadges'
import { TrainingLevelBadge } from '../TrainingBadges'
import { StationRequiredSkillForm } from '../StationRequiredSkillForm'
import { ConfirmDialog } from '../ConfirmDialog'
import { EmptyState } from '../EmptyState'
import { createStationRequiredSkill, deleteStationRequiredSkill, updateStationRequiredSkill } from '../../services/trainingService'
import type { StationRequiredSkill, StationRequiredSkillInput, TrainingSkill } from '../../Types/training'
import type { Station } from '../../Types/settings'

type Props = {
  required: StationRequiredSkill[]
  stations: Station[]
  skills: TrainingSkill[]
  canManage: boolean
  onChanged: () => Promise<void>
  notify: (msg: string, isError?: boolean) => void
}

export function StationRequiredSkillsTab({ required, stations, skills, canManage, onChanged, notify }: Props) {
  const { t } = useLang()
  const [stationId, setStationId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StationRequiredSkill | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StationRequiredSkill | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => required.filter(r => !stationId || r.stationId === stationId), [required, stationId])
  const stationOf = (id: string) => stations.find(x => x.id === id)
  const stationLabel = (id: string) => {
    const s = stationOf(id)
    return s ? `${s.station_number} - ${s.station_name}` : id
  }

  async function submit(input: StationRequiredSkillInput): Promise<boolean> {
    setBusy(true)
    try {
      if (editing) await updateStationRequiredSkill(editing.id, input)
      else await createStationRequiredSkill(input)
      await onChanged(); notify(t('settings.added')); setFormOpen(false); return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      if (msg === 'DUPLICATE') return false
      notify(msg, true); return false
    } finally { setBusy(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try { await deleteStationRequiredSkill(deleteTarget.id); await onChanged(); notify(t('settings.deleted')); setDeleteTarget(null) }
    catch (e) { notify(e instanceof Error ? e.message : t('common.error'), true) }
    finally { setBusy(false) }
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
        <select className="input-dark max-w-xs" value={stationId} onChange={e => setStationId(e.target.value)}>
          <option value="">{t('training.filters.station')}</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.station_number} - {s.station_name}</option>)}
        </select>
        {canManage && (
          <button onClick={() => { setEditing(null); setFormOpen(true) }} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
            <Plus className="mr-1 inline h-4 w-4" /> {t('training.addStationSkill')}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('training.empty')} hint={canManage ? t('training.emptyHint') : undefined} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-start">
            <thead className="bg-slate-950/90">
              <tr>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('training.srsCols.stationCode')}</th>
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('training.srsCols.stationName')}</th>
                {['skill', 'level', 'mandatory', 'status'].map(c => (
                  <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`training.srs.${c}`)}</th>
                ))}
                {canManage && <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(r => {
                const st = stationOf(r.stationId)
                return (
                  <tr key={r.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                    <td className="table-cell font-black text-white" dir="ltr">{st?.station_number ?? '-'}</td>
                    <td className="table-cell text-slate-200">{st?.station_name ?? r.stationId}</td>
                    <td className="table-cell font-bold text-slate-100">{r.skillName ?? r.skillCode}</td>
                    <td className="table-cell"><TrainingLevelBadge level={r.requiredLevel} /></td>
                    <td className="table-cell text-slate-300">{r.isMandatory ? t('common.yes') : t('common.no')}</td>
                    <td className="table-cell"><ActiveBadge active={r.isActive} /></td>
                    {canManage && (
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(r); setFormOpen(true) }} className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteTarget(r)} className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <StationRequiredSkillForm open={formOpen} editing={editing} defaultStationId={stationId || undefined} stations={stations} skills={skills} busy={busy} onClose={() => setFormOpen(false)} onSubmit={submit} />
      <ConfirmDialog open={Boolean(deleteTarget)} title={t('training.delete')} message={deleteTarget ? `${stationLabel(deleteTarget.stationId)} — ${deleteTarget.skillName}` : ''} confirmLabel={t('training.delete')} cancelLabel={t('common.cancel')} busy={busy} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
