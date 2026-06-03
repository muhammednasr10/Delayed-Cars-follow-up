import { useEffect, useState } from 'react'
import { Factory } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field, inputCls } from '../FormField'
import { createParentStation } from '../../services/stationOperationsService'
import { updateStation } from '../../services/settingsService'
import type { WorkArea } from '../../Types/settings'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  stationId: string | null
  stationNumber: string
  stationName: string
  workAreaId: string | null
  totalWorkers: number
  avgStationTimeMinutes: number | null
  workAreas: WorkArea[]
  busy: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}

export function ParentStationEditModal({
  open,
  mode,
  stationId,
  stationNumber,
  stationName,
  workAreaId,
  totalWorkers,
  avgStationTimeMinutes,
  workAreas,
  busy,
  onClose,
  onSaved
}: Props) {
  const { t } = useLang()
  const [code, setCode] = useState(stationNumber)
  const [name, setName] = useState(stationName)
  const [areaId, setAreaId] = useState(workAreaId ?? '')
  const [workers, setWorkers] = useState(String(totalWorkers))
  const [avgTime, setAvgTime] = useState(avgStationTimeMinutes != null ? String(avgStationTimeMinutes) : '')

  useEffect(() => {
    if (!open) return
    setCode(mode === 'create' ? '' : stationNumber)
    setName(mode === 'create' ? '' : stationName)
    setAreaId(workAreaId ?? '')
    setWorkers(mode === 'create' ? '' : String(totalWorkers))
    setAvgTime(avgStationTimeMinutes != null ? String(avgStationTimeMinutes) : '')
  }, [open, mode, stationNumber, stationName, workAreaId, totalWorkers, avgStationTimeMinutes])

  async function save() {
    if (!name.trim() || !code.trim()) return
    const headcount = workers.trim() ? Math.max(1, Math.round(Number(workers))) : null
    const avg = avgTime.trim() ? Number(avgTime) : null
    if (workers.trim() && !Number.isFinite(headcount)) return
    if (avgTime.trim() && !Number.isFinite(avg)) return

    if (mode === 'create') {
      await createParentStation({
        stationNumber: code.trim(),
        stationName: name.trim(),
        workAreaId: areaId || null,
        headcountWorkers: headcount,
        avgStationTimeMinutes: avg
      })
    } else {
      if (!stationId) return
      await updateStation(stationId, {
        station_number: code.trim(),
        station_name: name.trim(),
        work_area_id: areaId || null,
        headcount_workers: headcount,
        avg_station_time_minutes: avg
      })
    }
    await onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={mode === 'create' ? t('operations.addParentStation') : t('operations.editParentStation')}
      icon={<Factory className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button disabled={busy} onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            disabled={busy || !name.trim() || !code.trim() || (mode === 'edit' && !stationId)}
            onClick={save}
            className="rounded-xl bg-cyan-500 px-5 py-2 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('operations.stationCode')} required>
          <input className={inputCls()} value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="PBS1" />
        </Field>
        <Field label={t('operations.workerCode')} required>
          <input
            className={inputCls()}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('operations.stationNamePh')}
          />
        </Field>
        <Field label={t('operations.workplace')}>
          <select className={inputCls()} value={areaId} onChange={e => setAreaId(e.target.value)}>
            <option value="">{t('operations.workplaceEmpty')}</option>
            {workAreas.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('operations.totalWorkers')}>
            <input type="number" min={1} className={inputCls()} value={workers} onChange={e => setWorkers(e.target.value)} />
          </Field>
          <Field label={t('operations.avgStationTime')}>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputCls()}
              value={avgTime}
              onChange={e => setAvgTime(e.target.value)}
            />
          </Field>
        </div>
        {mode === 'edit' && !stationId && (
          <p className="text-xs text-amber-300">{t('operations.noParentStationId')}</p>
        )}
      </div>
    </Modal>
  )
}
