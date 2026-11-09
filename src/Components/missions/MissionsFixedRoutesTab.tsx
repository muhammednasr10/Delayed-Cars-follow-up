import { useCallback, useEffect, useState } from 'react'
import { Pin, RefreshCcw, Save } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useMyOrgScope } from '../../hooks/useMyOrgScope'
import { EmployeeAutocomplete } from '../EmployeeAutocomplete'
import { listMissionAutoRoutes, saveMissionAutoRoute } from '../../services/missionAutoRouteService'
import type { MissionAutoRoute, MissionAutoRouteEvent } from '../../Types/missionAutoRoute'
import { MISSION_AUTO_ROUTE_EVENTS } from '../../Types/missionAutoRoute'
import { missionAutoRouteEventLabelKey } from '../../Utils/missionAutoRouteTitles'

type Draft = {
  assigneeEmployeeId: string
  enabled: boolean
}

export function MissionsFixedRoutesTab() {
  const { t } = useLang()
  const { employees } = useEmployees()
  const { canAssignMissions, canViewAllMissions } = useMyOrgScope(employees)
  const canEdit = canAssignMissions || canViewAllMissions

  const [routes, setRoutes] = useState<MissionAutoRoute[]>([])
  const [drafts, setDrafts] = useState<Record<MissionAutoRouteEvent, Draft>>(() =>
    Object.fromEntries(MISSION_AUTO_ROUTE_EVENTS.map(e => [e, { assigneeEmployeeId: '', enabled: true }])) as Record<
      MissionAutoRouteEvent,
      Draft
    >
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<MissionAutoRouteEvent | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await listMissionAutoRoutes()
      setRoutes(rows)
      setDrafts(
        Object.fromEntries(
          rows.map(r => [
            r.eventType,
            { assigneeEmployeeId: r.assigneeEmployeeId ?? '', enabled: r.enabled }
          ])
        ) as Record<MissionAutoRouteEvent, Draft>
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  async function saveOne(eventType: MissionAutoRouteEvent) {
    if (!canEdit) return
    const draft = drafts[eventType]
    setSaving(eventType)
    setError('')
    setSuccess('')
    try {
      await saveMissionAutoRoute({
        eventType,
        assigneeEmployeeId: draft.assigneeEmployeeId || null,
        enabled: draft.enabled
      })
      setSuccess(t('missions.fixedRoutes.saved'))
      window.setTimeout(() => setSuccess(''), 2500)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1 text-start">
          <p className="text-sm font-bold text-slate-100">{t('missions.fixedRoutes.hint')}</p>
          <p className="text-xs text-slate-400">{t('missions.fixedRoutes.hint2')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}
      {!canEdit && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {t('missions.fixedRoutes.readOnly')}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full min-w-[640px] border-collapse text-start text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2.5 font-bold">{t('missions.fixedRoutes.cols.event')}</th>
              <th className="px-3 py-2.5 font-bold">{t('missions.fixedRoutes.cols.assignee')}</th>
              <th className="px-3 py-2.5 font-bold">{t('missions.fixedRoutes.cols.enabled')}</th>
              <th className="px-3 py-2.5 font-bold">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {MISSION_AUTO_ROUTE_EVENTS.map(eventType => {
              const draft = drafts[eventType]
              const current = routes.find(r => r.eventType === eventType)
              return (
                <tr key={eventType} className="border-t border-slate-800/80 bg-slate-950/40">
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        <div className="font-bold text-slate-100">{t(missionAutoRouteEventLabelKey(eventType))}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {t(`missions.fixedRoutes.eventHints.${eventType}`)}
                        </div>
                        {current?.assigneeName && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {t('missions.fixedRoutes.current')}: {current.assigneeName}
                            {current.assigneeCode ? ` (${current.assigneeCode})` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className={!canEdit ? 'pointer-events-none opacity-70' : undefined}>
                      <EmployeeAutocomplete
                        employees={employees}
                        value={draft?.assigneeEmployeeId ?? ''}
                        onChange={id =>
                          setDrafts(prev => ({
                            ...prev,
                            [eventType]: { ...prev[eventType], assigneeEmployeeId: id }
                          }))
                        }
                        placeholder={t('missions.fixedRoutes.pickEmployee')}
                        activeOnly
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <label className="inline-flex items-center gap-2 text-slate-200">
                      <input
                        type="checkbox"
                        checked={draft?.enabled ?? true}
                        disabled={!canEdit || saving === eventType}
                        onChange={e =>
                          setDrafts(prev => ({
                            ...prev,
                            [eventType]: { ...prev[eventType], enabled: e.target.checked }
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500"
                      />
                      <span className="text-xs font-bold">
                        {draft?.enabled ? t('missions.fixedRoutes.on') : t('missions.fixedRoutes.off')}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <button
                      type="button"
                      disabled={!canEdit || saving === eventType || loading}
                      onClick={() => void saveOne(eventType)}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving === eventType ? t('common.saving') : t('common.save')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
