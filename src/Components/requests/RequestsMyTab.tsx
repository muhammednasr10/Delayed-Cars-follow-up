import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { TeamRequestFormModal } from './TeamRequestFormModal'
import { createTeamRequest, getTeamRequests } from '../../services/teamRequestService'
import { formatPeopleList } from '../../Utils/missionPeople'
import type { TeamRequest, TeamRequestInput } from '../../Types/teamRequest'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

const STATUS_TONES: Record<TeamRequest['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-200 border-red-500/30',
  converted: 'bg-violet-500/15 text-violet-200 border-violet-500/30'
}

export function RequestsMyTab() {
  const { t, lang } = useLang()
  const { employees } = useEmployees()
  const { employeeId, managers } = useMyOrgScope(employees)

  const [items, setItems] = useState<TeamRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getTeamRequests())
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const myItems = useMemo(
    () => (employeeId ? items.filter(i => i.requesterId === employeeId) : []),
    [items, employeeId]
  )

  function formatDate(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' })
  }

  async function handleSave(input: TeamRequestInput) {
    if (!employeeId) return
    setSaving(true)
    try {
      await createTeamRequest(employeeId, input)
      setFormOpen(false)
      setSuccess(t('requests.submitted'))
      window.setTimeout(() => setSuccess(''), 2500)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (!employeeId) {
    return (
      <div className="card-industrial p-6 text-center">
        <p className="text-sm font-bold text-amber-200">{t('missions.my.noEmployeeLink')}</p>
        <p className="mt-2 text-sm text-slate-400">{t('missions.my.noEmployeeHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">{t('requests.myHint')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400"
          >
            <Plus className="h-4 w-4" />
            {t('requests.newRequest')}
          </button>
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('requests.setupTitle')}</p>
          <p className="mt-1">{t('requests.setupHint')}</p>
        </div>
      )}

      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
      {error && !setupRequired && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="card-industrial overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('requests.cols.date')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('requests.cols.managers')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('requests.cols.title')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('requests.cols.status')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('requests.cols.response')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : myItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-slate-500">
                  {t('requests.myEmpty')}
                </td>
              </tr>
            ) : (
              myItems.map(row => (
                <tr key={row.id} className="bg-slate-900/30">
                  <td className={`${cell} text-slate-300`}>{formatDate(row.createdAt)}</td>
                  <td className={cell}>
                    <p className="font-bold text-slate-200">{formatPeopleList(row.managers)}</p>
                    {row.managers.length > 1 && (
                      <p className="text-xs text-slate-500">{t('requests.selectedManagers', { n: row.managers.length })}</p>
                    )}
                  </td>
                  <td className={`${cell} max-w-[14rem] text-start`}>
                    <p className="font-bold text-white">{row.title}</p>
                    {row.description && <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>}
                  </td>
                  <td className={cell}>
                    <span className={`inline-block rounded-lg border px-2 py-0.5 text-xs font-bold ${STATUS_TONES[row.status]}`}>
                      {t(`requests.status.${row.status}`)}
                    </span>
                  </td>
                  <td className={`${cell} max-w-[12rem] truncate text-slate-400`}>{row.managerResponse || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TeamRequestFormModal open={formOpen} managers={managers} onClose={() => setFormOpen(false)} onSave={handleSave} saving={saving} />
    </div>
  )
}
