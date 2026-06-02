import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Car, PlusCircle, RefreshCcw, ShieldAlert, Truck } from 'lucide-react'
import { useVehicles } from '../Context/VehiclesContext'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { StatCard } from '../Components/StatCard'
import { NewVehicleModal } from '../Components/NewVehicleModal'
import { SetupRequired } from '../Components/SetupRequired'
import {
  CompletionBar,
  DeliveryBadge,
  ProductionStatusBadge,
  QcBadge
} from '../Components/VehicleBadges'
import type { VehicleFilters, VehicleOverview } from '../Types/vehicle'

const emptyFilters: VehicleFilters = { search: '', deliveryStatus: '', qcStatus: '', blockedOnly: false }

export function VehiclesPage() {
  const { vehicles, loading, error, setupRequired, refresh, release, deliver } = useVehicles()
  const { hasRole } = useAuth()
  const { t } = useLang()
  const [filters, setFilters] = useState<VehicleFilters>(emptyFilters)
  const [showNew, setShowNew] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const canCreate = hasRole('admin', 'production')
  const canRelease = hasRole('admin', 'production')

  const counts = useMemo(() => {
    const total = vehicles.length
    const withMissing = vehicles.filter(v => v.openMissingCount > 0).length
    const blocked = vehicles.filter(v => v.deliveryBlocked).length
    const qcFailed = vehicles.filter(v => v.qcStatus === 'failed').length
    return { total, withMissing, blocked, qcFailed }
  }, [vehicles])

  const filtered = useMemo(() => {
    return vehicles
      .filter(v => !filters.deliveryStatus || v.deliveryStatus === filters.deliveryStatus)
      .filter(v => !filters.qcStatus || v.qcStatus === filters.qcStatus)
      .filter(v => !filters.blockedOnly || v.deliveryBlocked)
      .filter(v => {
        const q = filters.search.trim().toLowerCase()
        if (!q) return true
        return [v.vin, v.modelName, v.productionOrderNumber].join(' ').toLowerCase().includes(q)
      })
  }, [vehicles, filters])

  async function handleRelease(v: VehicleOverview) {
    setActionError('')
    setBusyId(v.id)
    const result = await release(v.id)
    setBusyId(null)
    if (!result.ok) setActionError(result.message || t('common.error'))
  }

  async function handleDeliver(v: VehicleOverview) {
    setActionError('')
    setBusyId(v.id)
    const result = await deliver(v.id)
    setBusyId(null)
    if (!result.ok) setActionError(result.message || t('common.error'))
  }

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title={t('vehicles.total')} value={counts.total} subtitle={t('home.totalSub')} tone="cyan" icon={<Car className="h-6 w-6" />} />
        <StatCard title={t('vehicles.withMissing')} value={counts.withMissing} subtitle={t('home.withMissingSub')} tone="orange" icon={<AlertTriangle className="h-6 w-6" />} />
        <StatCard title={t('vehicles.blocked')} value={counts.blocked} subtitle={t('home.blockedSub')} tone="red" icon={<ShieldAlert className="h-6 w-6" />} />
        <StatCard title={t('vehicles.qcFailed')} value={counts.qcFailed} subtitle="QC" tone="red" icon={<ShieldAlert className="h-6 w-6" />} />
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-white">{t('vehicles.title')}</h2>
              <p className="text-sm text-slate-400">{t('vehicles.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={refresh} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
              </button>
              {canCreate && (
                <button onClick={() => setShowNew(true)} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400">
                  <PlusCircle className="mr-1 inline h-4 w-4" /> {t('vehicles.newVehicle')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="input-dark"
              placeholder={t('common.search')}
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <select className="input-dark" value={filters.deliveryStatus} onChange={e => setFilters(prev => ({ ...prev, deliveryStatus: e.target.value as VehicleFilters['deliveryStatus'] }))}>
              <option value="">{t('common.all')}</option>
              <option value="blocked">{t('deliveryStatus.blocked')}</option>
              <option value="ready">{t('deliveryStatus.ready')}</option>
              <option value="delivered">{t('deliveryStatus.delivered')}</option>
            </select>
            <select className="input-dark" value={filters.qcStatus} onChange={e => setFilters(prev => ({ ...prev, qcStatus: e.target.value as VehicleFilters['qcStatus'] }))}>
              <option value="">{t('common.all')}</option>
              <option value="pending">{t('qcStatus.pending')}</option>
              <option value="passed">{t('qcStatus.passed')}</option>
              <option value="failed">{t('qcStatus.failed')}</option>
              <option value="not_required">{t('qcStatus.not_required')}</option>
            </select>
            <button
              onClick={() => setFilters(prev => ({ ...prev, blockedOnly: !prev.blockedOnly }))}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${filters.blockedOnly ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {filters.blockedOnly ? t('deliveryStatus.blocked') : t('common.all')}
            </button>
          </div>
        </div>

        {error && !setupRequired && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {actionError && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-start">
            <thead className="bg-slate-950/90">
              <tr>
                {['vin', 'model', 'po', 'missing', 'completion', 'production', 'qc', 'delivery'].map(c => (
                  <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`vehicles.cols.${c}`)}</th>
                ))}
                <th className="table-cell text-xs font-black uppercase text-slate-400">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(v => (
                <tr key={v.id} className={`hover:bg-slate-800/40 ${v.deliveryBlocked ? 'bg-red-500/5' : 'bg-slate-900/30'}`}>
                  <td className="table-cell font-black text-white">{v.vin}</td>
                  <td className="table-cell">{v.modelName}</td>
                  <td className="table-cell">{v.productionOrderNumber || '-'}</td>
                  <td className="table-cell">
                    {v.openMissingCount > 0
                      ? <span className="font-black text-red-300">{v.openMissingCount}</span>
                      : <span className="text-emerald-300">0</span>}
                  </td>
                  <td className="table-cell"><CompletionBar percent={v.completionPercent} /></td>
                  <td className="table-cell"><ProductionStatusBadge status={v.productionStatus} /></td>
                  <td className="table-cell"><QcBadge status={v.qcStatus} /></td>
                  <td className="table-cell"><DeliveryBadge status={v.deliveryStatus} /></td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      {canRelease && v.deliveryStatus === 'blocked' && (
                        <button
                          disabled={busyId === v.id || v.deliveryBlocked}
                          onClick={() => handleRelease(v)}
                          title={v.deliveryBlocked ? t('vehicles.blockedHint') : t('vehicles.release')}
                          className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle2 className="inline h-3 w-3" /> {t('vehicles.release')}
                        </button>
                      )}
                      {canRelease && v.deliveryStatus === 'ready' && (
                        <button
                          disabled={busyId === v.id}
                          onClick={() => handleDeliver(v)}
                          className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
                        >
                          <Truck className="inline h-3 w-3" /> {t('vehicles.deliver')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">{t('common.noResults')}</div>
        )}
      </div>

      {showNew && <NewVehicleModal onClose={() => setShowNew(false)} />}
    </section>
  )
}
