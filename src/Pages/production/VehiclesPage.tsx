import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Car, Pencil, RefreshCcw, ShieldAlert, Trash2, Truck } from 'lucide-react'
import { useVehicles } from '../../Context/VehiclesContext'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useEmployees } from '../../hooks/useEmployees'
import { useFactoryOrgScope } from '../../hooks/useFactoryOrgScope'
import { StatCard } from '../../Components/StatCard'
import { NewVehicleEntryForm } from '../../Components/NewVehicleEntryForm'
import { EditVehicleEntryModal } from '../../Components/EditVehicleEntryModal'
import { SetupRequired } from '../../Components/SetupRequired'
import { ExportableTable } from '../../Components/ExportableTable'
import {
  DeliveryBadge
} from '../../Components/VehicleBadges'
import { getProductionOrders } from '../../services/productionOrdersService'
import { vinInChassisRange } from '../../Utils/chassisRange'
import { orgPathFromLeaf, orgPathLabel } from '../../Utils/employeeOrgPicker'
import type { ProductionOrder } from '../../Types/production'
import type { VehicleFilters, VehicleOverview } from '../../Types/vehicle'

const emptyFilters: VehicleFilters = { search: '', deliveryStatus: '', qcStatus: '', blockedOnly: false }

const entryCell = 'table-cell text-center align-middle'

export type VehiclesPageMode = 'entry' | 'exit'

type Props = {
  mode?: VehiclesPageMode
}

function resolveProductionOrderLabel(v: VehicleOverview, orders: ProductionOrder[]): string {
  if (v.productionOrderNumber) return v.productionOrderNumber
  const match = orders.find(
    o => o.chassisStart && o.chassisEnd && vinInChassisRange(v.vin, o.chassisStart, o.chassisEnd)
  )
  return match?.orderNumber ?? '—'
}

export function VehiclesPage({ mode = 'exit' }: Props) {
  const { vehicles, loading, error, setupRequired, refresh, release, deliver, removeVehicle } = useVehicles()
  const { hasRole } = useAuth()
  const { t } = useLang()
  const { employees } = useEmployees()
  const { filterRecords, isScopedView, scopeLabel, orgUnits } = useFactoryOrgScope(employees)
  const [filters, setFilters] = useState<VehicleFilters>(emptyFilters)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [editingVehicle, setEditingVehicle] = useState<VehicleOverview | null>(null)

  const canManage = hasRole('admin', 'production')
  const canRelease = hasRole('admin', 'production')
  const canAddEntry = canManage || isScopedView

  const scopedVehicles = useMemo(() => filterRecords(vehicles), [vehicles, filterRecords])

  function orgUnitLabel(id: string | null | undefined): string {
    if (!id) return '—'
    return orgPathLabel(orgPathFromLeaf(id, orgUnits), orgUnits) || '—'
  }

  useEffect(() => {
    getProductionOrders()
      .then(setProductionOrders)
      .catch(() => setProductionOrders([]))
  }, [])

  const counts = useMemo(() => {
    const total = scopedVehicles.length
    const withMissing = scopedVehicles.filter(v => v.openMissingCount > 0).length
    const blocked = scopedVehicles.filter(v => v.deliveryBlocked).length
    const qcFailed = scopedVehicles.filter(v => v.qcStatus === 'failed').length
    return { total, withMissing, blocked, qcFailed }
  }, [scopedVehicles])

  const filtered = useMemo(() => {
    return scopedVehicles
      .filter(v => v.deliveryStatus !== 'delivered')
      .filter(v => !filters.deliveryStatus || v.deliveryStatus === filters.deliveryStatus)
      .filter(v => !filters.qcStatus || v.qcStatus === filters.qcStatus)
      .filter(v => !filters.blockedOnly || v.deliveryBlocked)
      .filter(v => {
        const q = filters.search.trim().toLowerCase()
        if (!q) return true
        const poLabel = resolveProductionOrderLabel(v, productionOrders)
        return [v.vin, v.modelName, v.colorName, v.productionOrderNumber, poLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [scopedVehicles, filters, mode, productionOrders])

  const pageTitle = mode === 'entry' ? t('productivity.entryTitle') : t('productivity.exitTitle')
  const pageSubtitle = mode === 'entry' ? t('productivity.entrySubtitle') : t('productivity.exitSubtitle')
  const exitTableCols = ['model', 'color', 'vin', 'po', 'delivery'] as const

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

  async function handleDelete(v: VehicleOverview) {
    if (!window.confirm(t('vehicles.deleteEntryConfirm', { vin: v.vin }))) return
    setActionError('')
    setBusyId(v.id)
    const result = await removeVehicle(v.id)
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

      {mode === 'entry' && canAddEntry && <NewVehicleEntryForm onSaved={() => void refresh()} />}

      {isScopedView && scopeLabel && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {t('org.scopeBanner', { scope: scopeLabel })}
        </div>
      )}

      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-white">{pageTitle}</h2>
              <p className="text-sm text-slate-400">{pageSubtitle}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={refresh} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                <RefreshCcw className="mr-1 inline h-4 w-4" /> {t('common.refresh')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="input-dark"
              placeholder={t('common.search')}
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {error && !setupRequired && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {actionError && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{actionError}</div>}

        <ExportableTable
          filename={mode === 'entry' ? 'vehicles-entry' : 'vehicles-exit'}
          title={t('vehicles.title')}
          rowCount={filtered.length}
        >
        <div className="overflow-x-auto">
          {mode === 'entry' ? (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  <th className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('vehicles.cols.model')}</th>
                  <th className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('vehicles.cols.color')}</th>
                  <th className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('vehicles.cols.vin')}</th>
                  <th className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('vehicles.cols.orgUnit')}</th>
                  <th className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('vehicles.cols.po')}</th>
                  {canManage && (
                    <th data-export-skip className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(v => (
                  <tr key={v.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                    <td className={entryCell}>{v.modelName || '—'}</td>
                    <td className={entryCell}>
                      {v.colorName ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full ring-1 ring-slate-500"
                            style={{ backgroundColor: v.colorHex ?? '#fff' }}
                          />
                          {v.colorName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${entryCell} font-mono font-black text-white`} dir="ltr">
                      {v.vin}
                    </td>
                    <td className={entryCell}>{orgUnitLabel(v.factoryOrgUnitId)}</td>
                    <td className={`${entryCell} font-mono`} dir="ltr">
                      {resolveProductionOrderLabel(v, productionOrders)}
                    </td>
                    {canManage && (
                      <td data-export-skip className={entryCell}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title={t('common.edit')}
                            disabled={busyId === v.id}
                            onClick={() => setEditingVehicle(v)}
                            className="rounded-lg bg-orange-500/15 p-2 text-orange-200 hover:bg-orange-500/25 disabled:opacity-40"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t('common.delete')}
                            disabled={busyId === v.id}
                            onClick={() => void handleDelete(v)}
                            className="rounded-lg bg-red-500/15 p-2 text-red-200 hover:bg-red-500/25 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-950/90">
                <tr>
                  {exitTableCols.map(c => (
                    <th key={c} className={`${entryCell} text-xs font-black uppercase text-slate-400`}>
                      {t(`vehicles.cols.${c}`)}
                    </th>
                  ))}
                  {canRelease && (
                    <th data-export-skip className={`${entryCell} text-xs font-black uppercase text-slate-400`}>{t('common.actions')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(v => (
                  <tr
                    key={v.id}
                    className={`bg-slate-900/30 hover:bg-slate-800/40 ${v.deliveryBlocked ? 'bg-red-500/5' : ''}`}
                  >
                    <td className={entryCell}>{v.modelName || '—'}</td>
                    <td className={entryCell}>
                      {v.colorName ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full ring-1 ring-slate-500"
                            style={{ backgroundColor: v.colorHex ?? '#fff' }}
                          />
                          {v.colorName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${entryCell} font-mono font-black text-white`} dir="ltr">
                      {v.vin}
                    </td>
                    <td className={`${entryCell} font-mono`} dir="ltr">
                      {resolveProductionOrderLabel(v, productionOrders)}
                    </td>
                    <td className={entryCell}>
                      <DeliveryBadge status={v.deliveryStatus} />
                    </td>
                    {canRelease && (
                      <td data-export-skip className={entryCell}>
                        <div className="flex items-center justify-center gap-2">
                          {v.deliveryStatus === 'blocked' && (
                            <button
                              type="button"
                              title={v.deliveryBlocked ? t('vehicles.blockedHint') : t('vehicles.release')}
                              disabled={busyId === v.id || v.deliveryBlocked}
                              onClick={() => handleRelease(v)}
                              className="rounded-lg bg-cyan-500/15 p-2 text-cyan-200 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {v.deliveryStatus === 'ready' && (
                            <button
                              type="button"
                              title={t('vehicles.deliver')}
                              disabled={busyId === v.id}
                              onClick={() => handleDeliver(v)}
                              className="rounded-lg bg-emerald-500/15 p-2 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
                            >
                              <Truck className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">{t('common.noResults')}</div>
        )}
        </ExportableTable>
      </div>

      <EditVehicleEntryModal vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} />
    </section>
  )
}
