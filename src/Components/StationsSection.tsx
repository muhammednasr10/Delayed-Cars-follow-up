import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { MapPin, RefreshCcw } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { CrudSection } from './CrudSection'
import { StationWizardModal } from './StationWizardModal'
import { formatStationReferenceCode, composeStationNumber, parseStationNumberParts } from '../Utils/stationHierarchy'
import { createStationWizardDefaults, parseHeadcountWorkers, stationToWizardValues } from '../Utils/stationFormValues'
import { dedupeMasterStationsForDisplay } from '../Utils/stationMaster'
import { createStation, deleteStation, getAllStationNumbers, getStations, getWorkAreas, removeDuplicateMasterStations, updateStation } from '../services/settingsService'
import type { Station, WorkArea } from '../Types/settings'
import { supabase } from '../lib/supabase'
import { normalizeStationType, stationTypeLabel } from '../Utils/stationDisplay'

type Props = {
  canManage: boolean
  readOnly?: boolean
  sectionTitle?: string
  sectionHint?: string
  showRefresh?: boolean
  onError?: (message: string) => void
  onSuccess?: (message: string) => void
}

export type StationsSectionHandle = { reload: () => Promise<void> }

export const StationsSection = forwardRef<StationsSectionHandle, Props>(function StationsSection(
  { canManage, readOnly = false, sectionTitle, sectionHint, showRefresh = false, onError, onSuccess },
  ref
) {
  const { t } = useLang()
  const title = sectionTitle ?? t('engineering.stations.title')
  const hint = sectionHint ?? (readOnly ? t('engineering.stations.fromSettingsHint') : undefined)
  const manage = canManage && !readOnly
  const [stations, setStations] = useState<Station[]>([])
  const [allStationNumbers, setAllStationNumbers] = useState<string[]>([])
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([])
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')

  function showSuccess(message: string) {
    setLocalSuccess(message)
    setLocalError('')
    onSuccess?.(message)
    window.setTimeout(() => setLocalSuccess(''), 2500)
  }

  const load = useCallback(async () => {
    if (!supabase) {
      const msg = 'Supabase .env'
      setLocalError(msg)
      onError?.(msg)
      return
    }
    setLoading(true)
    setLocalError('')
    try {
      const [stationsData, areasData, numbers] = await Promise.all([
        getStations(),
        getWorkAreas(),
        getAllStationNumbers()
      ])
      if (manage) {
        const removed = await removeDuplicateMasterStations(stationsData)
        if (removed > 0) {
          const refreshed = await getStations()
          setStations(refreshed)
          showSuccess(t('settings.stationsDeduped', { n: removed }))
        } else {
          setStations(stationsData)
        }
      } else {
        setStations(stationsData)
      }
      setWorkAreas(areasData)
      setAllStationNumbers(numbers)
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('common.error')
      const msg = raw === 'station_duplicate' ? t('settings.stationDuplicate') : raw
      setLocalError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [manage, onError, onSuccess, t])

  const displayStations = useMemo(() => dedupeMasterStationsForDisplay(stations), [stations])

  useEffect(() => {
    void load()
  }, [load])

  useImperativeHandle(ref, () => ({ reload: load }), [load])

  async function runAction(action: () => Promise<void>, successMessage: string): Promise<boolean> {
    setLoading(true)
    setLocalError('')
    try {
      await action()
      await load()
      showSuccess(successMessage)
      return true
    } catch (err) {
      const raw = err instanceof Error ? err.message : t('common.error')
      const msg = raw === 'station_duplicate' ? t('settings.stationDuplicate') : raw
      setLocalError(msg)
      onError?.(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  const notifyLocally = onError == null && onSuccess == null

  return (
    <div className="space-y-4">
      {showRefresh && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
          </button>
        </div>
      )}
      {notifyLocally && localError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{localError}</div>
      )}
      {notifyLocally && localSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{localSuccess}</div>
      )}

      {hint && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {hint}
        </div>
      )}

      <CrudSection
        title={title}
        icon={<MapPin className="h-5 w-5" />}
        items={displayStations}
        busy={loading}
        canManage={manage}
        getId={s => s.id}
        getLabel={s => `${s.station_number} - ${s.station_name}`}
        fields={[
          { key: 'sort_order', label: t('settings.fields.sortOrder'), defaultValue: '0' },
          { key: 'station_base', label: t('settings.cols.stationName'), required: true, placeholder: 'PBS01' },
          { key: 'station_name', label: t('settings.fields.commonName'), required: true },
          { key: 'station_type', label: t('settings.fields.stationType'), defaultValue: 'main_line' },
          { key: 'is_active', label: t('settings.wizard.activeStatus'), defaultValue: 'true' }
        ]}
        columns={[
          {
            header: t('settings.cols.stationName'),
            className: 'text-center',
            render: s => (
              <span className="font-mono font-bold text-white" dir="ltr">
                {formatStationReferenceCode(s.station_number)}
              </span>
            )
          },
          {
            header: t('settings.cols.commonName'),
            className: 'text-center',
            render: s => <span className="font-bold text-slate-100">{s.station_name}</span>
          },
          { header: t('settings.cols.workArea'), className: 'text-center', render: s => s.work_areas?.name || '—' },
          { header: t('settings.fields.stationType'), className: 'text-center', render: s => stationTypeLabel(t, s.station_type) }
        ]}
        toValues={stationToWizardValues}
        getCreateValues={items => createStationWizardDefaults(items, allStationNumbers)}
        onCreate={v =>
          runAction(async () => {
            await createStation({
              station_number: v.station_number,
              station_name: v.station_name,
              station_type: normalizeStationType(v.station_type),
              sort_order: v.sort_order ? Number(v.sort_order) : 0,
              work_area_id: v.work_area_id || null,
              is_active: v.is_active !== 'false',
              headcount_workers: parseHeadcountWorkers(v.headcount_workers)
            })
          }, t('settings.added'))
        }
        onUpdate={(id, v) =>
          runAction(async () => {
            const editing = stations.find(s => s.id === id)
            const workerSuffix = editing ? parseStationNumberParts(editing.station_number).workerSuffix : ''
            const isWorkerLine = /-L\d+$/i.test(editing?.station_number ?? '')
            const station_number = isWorkerLine
              ? composeStationNumber(v.station_number || v.station_base, workerSuffix)
              : v.station_number
            await updateStation(id, {
              station_number,
              station_name: v.station_name,
              station_type: normalizeStationType(v.station_type),
              sort_order: v.sort_order ? Number(v.sort_order) : 0,
              work_area_id: v.work_area_id || null,
              is_active: v.is_active !== 'false',
              headcount_workers: parseHeadcountWorkers(v.headcount_workers)
            })
          }, t('settings.updated'))
        }
        onDelete={id => runAction(() => deleteStation(id), t('settings.deleted'))}
        renderWizard={p => (
          <StationWizardModal
            open={p.open}
            mode={p.mode}
            initialValues={p.initialValues}
            existingStationNumbers={allStationNumbers}
            excludeStationNumbers={
              p.mode === 'edit' && p.initialValues.station_number
                ? [p.initialValues.station_number, p.initialValues.station_base].filter(Boolean)
                : []
            }
            workAreas={workAreas}
            busy={p.busy}
            onClose={p.onClose}
            onSubmit={p.onSubmit}
          />
        )}
      />
    </div>
  )
})
