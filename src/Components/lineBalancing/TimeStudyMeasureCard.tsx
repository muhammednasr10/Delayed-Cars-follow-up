import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Trash2, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { TimeStudyStopwatch } from './TimeStudyStopwatch'
import {
  addTimeStudyReading,
  approveStudyWithReading,
  createTimeStudy,
  deleteTimeStudyReading,
  getTimeStudyReadings
} from '../../services/timeStudyService'
import type { TimeStudyMeasureSession, TimeStudyReading } from '../../Types/engineering'

type Props = {
  session: TimeStudyMeasureSession
  measuredByName: string
  canManage: boolean
  canApprove: boolean
  busy: boolean
  onBusyChange: (busy: boolean) => void
  onClose: () => void
  onApproved: () => void | Promise<void>
  onSaved: () => void
  notify: (msg: string, isError?: boolean) => void
}

export function TimeStudyMeasureCard({
  session,
  measuredByName,
  canManage,
  canApprove,
  busy,
  onBusyChange,
  onClose,
  onApproved,
  onSaved,
  notify
}: Props) {
  const { t } = useLang()
  const [studyId, setStudyId] = useState<string | null>(null)
  const [readings, setReadings] = useState<TimeStudyReading[]>([])
  const [selectedReadingId, setSelectedReadingId] = useState('')

  const refreshReadings = useCallback(async (id: string) => {
    const list = await getTimeStudyReadings(id)
    setReadings(list)
    setSelectedReadingId(prev => {
      if (prev && list.some(r => r.id === prev)) return prev
      return list.length > 0 ? list[list.length - 1].id : ''
    })
  }, [])

  useEffect(() => {
    if (studyId) void refreshReadings(studyId)
  }, [studyId, refreshReadings])

  async function ensureStudy(): Promise<string> {
    if (studyId) return studyId
    const id = await createTimeStudy({
      vehicle_model_id: session.vehicleModelId,
      station_id: session.stationId,
      operation_id: session.operationId,
      measurement_scope: session.scope,
      worker_station_id: session.workerStationId,
      subject_label: session.subjectLabel,
      measured_by_name: measuredByName,
      notes: `${session.modelLine} · ${session.scope}`
    })
    setStudyId(id)
    return id
  }

  async function handleCapture(seconds: number) {
    if (!canManage) return
    onBusyChange(true)
    try {
      const id = await ensureStudy()
      const cycle = readings.length + 1
      await addTimeStudyReading(id, cycle, seconds)
      await refreshReadings(id)
      notify(t('engineering.timeStudy.readingSaved', { sec: seconds }))
      onSaved()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      onBusyChange(false)
    }
  }

  async function handleDeleteReading(reading: TimeStudyReading) {
    if (!studyId || !canManage) return
    onBusyChange(true)
    try {
      await deleteTimeStudyReading(reading.id, studyId)
      await refreshReadings(studyId)
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      onBusyChange(false)
    }
  }

  async function handleApprove() {
    if (!studyId || !selectedReadingId) {
      notify(t('engineering.timeStudy.selectReadingFirst'), true)
      return
    }
    onBusyChange(true)
    try {
      await approveStudyWithReading(studyId, selectedReadingId)
      notify(t('engineering.timeStudy.approved'))
      await onApproved()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      onBusyChange(false)
    }
  }

  const lastSeconds = readings.length > 0 ? readings[readings.length - 1].observed_time_seconds : null

  return (
    <div className="card-industrial overflow-hidden border-violet-500/30">
      <div className="flex items-start justify-between gap-3 border-b border-violet-500/20 bg-violet-950/30 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-300/80">
            {t('engineering.timeStudy.activeMeasure')}
          </p>
          <p className="mt-1 text-lg font-black text-white">{session.subjectLabel}</p>
          <p className="mt-1 text-sm text-slate-400">
            {session.modelLine}
            {session.scope === 'operation' && ` · ${session.operationName}`}
            {session.scope === 'worker' && session.workerDisplayCode && ` · ${session.workerDisplayCode}`}
          </p>
          <p className="text-xs text-slate-500">
            {t('engineering.timeStudy.measuredBy')}: {measuredByName || '—'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <TimeStudyStopwatch disabled={!canManage || busy} onCapture={s => void handleCapture(s)} />

        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <span>
            {t('engineering.timeStudy.readingsCount')}:{' '}
            <strong className="text-cyan-200">{readings.length}</strong>
          </span>
          {lastSeconds != null && (
            <span>
              {t('engineering.timeStudy.lastReading')}:{' '}
              <strong className="font-mono text-orange-200" dir="ltr">
                {lastSeconds}s
              </strong>
            </span>
          )}
        </div>

        {readings.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="text-xs font-bold text-slate-400">{t('engineering.timeStudy.savedReadings')}</p>
              {canApprove && (
                <p className="mt-0.5 text-xs text-slate-500">{t('engineering.timeStudy.pickReadingToApprove')}</p>
              )}
            </div>
            <div className="divide-y divide-slate-800/60">
              {readings.map(r => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-800/40 ${
                    selectedReadingId === r.id ? 'bg-violet-500/10' : ''
                  }`}
                >
                  {canApprove && (
                    <input
                      type="radio"
                      name="reading-pick"
                      className="h-4 w-4 accent-violet-500"
                      checked={selectedReadingId === r.id}
                      onChange={() => setSelectedReadingId(r.id)}
                    />
                  )}
                  <span className="w-10 text-xs text-slate-500">#{r.cycle_no}</span>
                  <span className="flex-1 font-mono text-base font-bold text-cyan-100" dir="ltr">
                    {r.observed_time_seconds}s
                  </span>
                  {r.is_outlier && (
                    <span className="text-xs text-amber-300">{t('engineering.timeStudy.outlierYes')}</span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-300"
                      disabled={busy}
                      onClick={e => {
                        e.preventDefault()
                        void handleDeleteReading(r)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {canApprove && readings.length > 0 && (
          <button
            type="button"
            disabled={busy || !selectedReadingId}
            onClick={() => void handleApprove()}
            className="btn-industrial flex w-full items-center justify-center gap-2 bg-emerald-600 py-3 text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            {t('engineering.timeStudy.approveSelected')}
          </button>
        )}
      </div>
    </div>
  )
}
