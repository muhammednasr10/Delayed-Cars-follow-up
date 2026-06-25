import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Plus } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useAuth, profileIsAdmin } from '../../Context/AuthContext'
import { usePermissions } from '../../Context/PermissionsContext'
import { useTimeStudies } from '../../hooks/useTimeStudies'
import { useStationOperations } from '../../hooks/useStationOperations'
import { Modal } from '../Modal'
import { TimeStudyCreateWizard } from './TimeStudyCreateWizard'
import { TimeStudyMeasureCard } from './TimeStudyMeasureCard'
import {
  addTimeStudyReading,
  approveTimeStudy,
  deleteTimeStudyReading,
  getTimeStudy,
  getTimeStudyReadings,
  recalcTimeStudy,
  setReadingExcluded,
  submitTimeStudyForReview,
  updateTimeStudy
} from '../../services/timeStudyService'
import type { TimeStudy, TimeStudyMeasureSession, TimeStudyReading } from '../../Types/engineering'
import type { VehicleModel } from '../../Types/settings'
import { TimeStudyStopwatch } from './TimeStudyStopwatch'

type Props = {
  models: VehicleModel[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

export function TimeStudyTab({ models, canManage, notify }: Props) {
  const { t } = useLang()
  const { profile } = useAuth()
  const { hasPermission } = usePermissions()
  const canApprove =
    profileIsAdmin(profile) ||
    hasPermission('station_operations', 'approve') ||
    hasPermission('station_operations', 'manage')
  const { studies, loading, error: listError, reload } = useTimeStudies()
  const { parentGroups } = useStationOperations()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [measureSession, setMeasureSession] = useState<TimeStudyMeasureSession | null>(null)
  const [editor, setEditor] = useState<TimeStudy | null>(null)
  const [readings, setReadings] = useState<TimeStudyReading[]>([])
  const [newCycle, setNewCycle] = useState('')
  const [newSeconds, setNewSeconds] = useState('')
  const [busy, setBusy] = useState(false)

  const measuredByName =
    profile?.full_name?.trim() || profile?.employee_full_name?.trim() || profile?.email || ''

  async function openEditor(study: TimeStudy) {
    setEditor(study)
    try {
      setReadings(await getTimeStudyReadings(study.id))
    } catch {
      setReadings([])
    }
  }

  async function refreshEditor() {
    if (!editor) return
    const fresh = await getTimeStudy(editor.id)
    if (fresh) setEditor(fresh)
    setReadings(await getTimeStudyReadings(editor.id))
    await reload()
  }

  async function handleApprove(study: TimeStudy) {
    setBusy(true)
    try {
      await approveTimeStudy(study.id)
      await reload()
      if (editor?.id === study.id) await refreshEditor()
      notify(t('engineering.timeStudy.approved'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function addReading() {
    if (!editor || !canManage) return
    const sec = Number(newSeconds)
    const cycle = Number(newCycle) || readings.length + 1
    if (sec <= 0) {
      notify(t('engineering.timeStudy.invalidReading'), true)
      return
    }
    setBusy(true)
    try {
      await addTimeStudyReading(editor.id, cycle, sec)
      setNewSeconds('')
      setNewCycle('')
      await refreshEditor()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  const editable = editor && (editor.status === 'draft' || editor.status === 'under_review')

  function scopeLabel(scope: TimeStudy['measurement_scope']): string {
    if (scope === 'station') return t('engineering.timeStudy.scopeStation')
    if (scope === 'worker') return t('engineering.timeStudy.scopeWorker')
    return t('engineering.timeStudy.scopeOperation')
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="btn-industrial flex w-full items-center justify-center gap-2 bg-violet-500 py-3 text-base font-black text-slate-950"
        >
          <Plus className="h-5 w-5" />
          {t('engineering.timeStudy.newStudy')}
        </button>
      )}

      <TimeStudyCreateWizard
        open={wizardOpen}
        models={models}
        parentGroups={parentGroups}
        onClose={() => setWizardOpen(false)}
        onStart={session => setMeasureSession(session)}
      />

      {measureSession && (
        <TimeStudyMeasureCard
          session={measureSession}
          measuredByName={measuredByName}
          canManage={canManage}
          canApprove={canApprove}
          busy={busy}
          onBusyChange={setBusy}
          onClose={() => setMeasureSession(null)}
          onApproved={async () => {
            await reload()
            setMeasureSession(null)
          }}
          onSaved={() => void reload()}
          notify={notify}
        />
      )}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-black text-slate-200">{t('engineering.timeStudy.logTitle')}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{t('engineering.timeStudy.logAllHint')}</p>
        </div>
        {listError && (
          <p className="border-b border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{listError}</p>
        )}
        {loading ? (
          <p className="p-4 text-slate-400">{t('common.loading')}</p>
        ) : studies.length === 0 ? (
          <p className="p-4 text-slate-400">{t('engineering.timeStudy.noStudiesYet')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3 text-start">{t('engineering.timeStudy.code')}</th>
                  <th className="p-3 text-start">{t('engineering.timeStudy.subject')}</th>
                  <th className="p-3 text-start">{t('engineering.timeStudy.measuredBy')}</th>
                  <th className="p-3">{t('bom.model')}</th>
                  <th className="p-3">{t('engineering.timeStudy.scope')}</th>
                  <th className="p-3">{t('engineering.timeStudy.standard')}</th>
                  <th className="p-3">{t('engineering.timeStudy.status')}</th>
                  <th className="p-3 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {studies.map(s => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-cyan-300">{s.study_code}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-100">{s.subject_label || s.operation_name_ar || '—'}</div>
                      {s.operation_name_ar && s.subject_label && (
                        <div className="text-xs text-slate-500">{s.operation_name_ar}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">{s.measured_by_name || '—'}</td>
                    <td className="p-3 text-center">{s.vehicle_model_name ?? '—'}</td>
                    <td className="p-3 text-center text-xs">{scopeLabel(s.measurement_scope)}</td>
                    <td className="p-3 text-center font-mono" dir="ltr">
                      {s.standard_time_seconds != null ? `${s.standard_time_seconds.toFixed(1)}s` : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs ${
                          s.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {s.status === 'approved'
                          ? t('engineering.timeStudy.statusApproved')
                          : t('engineering.timeStudy.statusDraft')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="text-cyan-300 hover:underline"
                          onClick={() => void openEditor(s)}
                        >
                          {s.status === 'approved' ? t('common.view') : t('common.edit')}
                        </button>
                        {canApprove && s.status !== 'approved' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
                            disabled={busy}
                            onClick={() => void handleApprove(s)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t('engineering.timeStudy.approve')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!editor}
        title={editor?.study_code ?? ''}
        subtitle={editor?.subject_label ?? editor?.operation_name_ar}
        icon={<Clock className="h-5 w-5" />}
        onClose={() => setEditor(null)}
        maxWidthClass="max-w-3xl"
        footer={
          editor && (
            <div className="flex flex-wrap gap-2">
              {canManage && editable && editor.status === 'draft' && (
                <button
                  type="button"
                  className="btn-industrial bg-slate-700"
                  disabled={busy}
                  onClick={async () => {
                    await submitTimeStudyForReview(editor.id)
                    await refreshEditor()
                    notify(t('engineering.timeStudy.submitted'))
                  }}
                >
                  {t('engineering.timeStudy.submitReview')}
                </button>
              )}
              {canApprove && editable && (
                <button
                  type="button"
                  className="btn-industrial flex items-center gap-2 bg-emerald-600 text-white"
                  disabled={busy}
                  onClick={() => void handleApprove(editor)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('engineering.timeStudy.approve')}
                </button>
              )}
            </div>
          )
        }
      >
        {editor && (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-400">
              <p>
                <span className="text-slate-500">{t('engineering.timeStudy.measuredBy')}:</span>{' '}
                {editor.measured_by_name || '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('engineering.timeStudy.subject')}:</span>{' '}
                {editor.subject_label || editor.operation_name_ar || '—'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label={t('engineering.timeStudy.avgObserved')} value={editor.average_observed_time_seconds} />
              <Metric label={t('engineering.timeStudy.normal')} value={editor.normal_time_seconds} />
              <Metric label={t('engineering.timeStudy.standard')} value={editor.standard_time_seconds} />
              <Metric label={t('engineering.timeStudy.manpower')} value={editor.required_manpower} />
            </div>

            {canManage && editable && (
              <>
                <TimeStudyStopwatch
                  disabled={busy}
                  onCapture={async sec => {
                    setBusy(true)
                    try {
                      await addTimeStudyReading(editor.id, readings.length + 1, sec)
                      await refreshEditor()
                      notify(t('engineering.timeStudy.readingSaved', { sec }))
                    } catch (e) {
                      notify(e instanceof Error ? e.message : t('common.error'), true)
                    } finally {
                      setBusy(false)
                    }
                  }}
                />
                <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 p-3">
                  <div>
                    <label className="text-xs text-slate-500">{t('engineering.timeStudy.cycle')}</label>
                    <input
                      className="input-industrial w-20"
                      type="number"
                      value={newCycle}
                      onChange={e => setNewCycle(e.target.value)}
                      placeholder="#"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">{t('engineering.timeStudy.readingSec')}</label>
                    <input
                      className="input-industrial w-full"
                      type="number"
                      step="0.1"
                      value={newSeconds}
                      onChange={e => setNewSeconds(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn-industrial bg-cyan-600/30 text-cyan-100"
                    onClick={() => void addReading()}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <FactorField
                label={t('engineering.timeStudy.rating')}
                value={editor.rating_factor}
                disabled={!canManage || !editable}
                onChange={async v => {
                  await updateTimeStudy(editor.id, { rating_factor: v })
                  await refreshEditor()
                }}
              />
              <FactorField
                label={t('engineering.timeStudy.allowance')}
                value={editor.allowance_factor}
                disabled={!canManage || !editable}
                onChange={async v => {
                  await updateTimeStudy(editor.id, { allowance_factor: v })
                  await refreshEditor()
                }}
              />
              <FactorField
                label={t('engineering.timeStudy.takt')}
                value={editor.takt_time_seconds ?? 0}
                disabled={!canManage || !editable}
                onChange={async v => {
                  await updateTimeStudy(editor.id, { takt_time_seconds: v > 0 ? v : null })
                  await recalcTimeStudy(editor.id)
                  await refreshEditor()
                }}
              />
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400">
                  <th className="p-2">{t('engineering.timeStudy.cycle')}</th>
                  <th className="p-2">{t('engineering.timeStudy.readingSec')}</th>
                  <th className="p-2">{t('engineering.timeStudy.outlier')}</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id} className={r.is_outlier ? 'bg-amber-500/10' : ''}>
                    <td className="p-2">{r.cycle_no}</td>
                    <td className="p-2 font-mono">{r.observed_time_seconds}</td>
                    <td className="p-2 text-center text-xs text-amber-300">
                      {r.is_outlier ? t('engineering.timeStudy.outlierYes') : '—'}
                    </td>
                    <td className="p-2 text-end">
                      {canManage && editable && (
                        <>
                          <button
                            type="button"
                            className="text-xs text-slate-400 hover:text-white"
                            onClick={() =>
                              void setReadingExcluded(r.id, editor.id, !r.exclude_from_avg).then(refreshEditor)
                            }
                          >
                            {r.exclude_from_avg
                              ? t('engineering.timeStudy.include')
                              : t('engineering.timeStudy.exclude')}
                          </button>
                          <button
                            type="button"
                            className="ms-2 text-xs text-red-300"
                            onClick={() => void deleteTimeStudyReading(r.id, editor.id).then(refreshEditor)}
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-slate-800/80 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-black text-cyan-200">
        {value != null ? `${value.toFixed(2)}s` : '—'}
      </p>
    </div>
  )
}

function FactorField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string
  value: number
  disabled: boolean
  onChange: (v: number) => Promise<void>
}) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => setLocal(String(value)), [value])
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        className="input-industrial w-full"
        type="number"
        step="0.01"
        disabled={disabled}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => void onChange(Number(local))}
      />
    </div>
  )
}
