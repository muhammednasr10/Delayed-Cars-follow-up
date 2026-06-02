import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, PlusCircle, RefreshCcw, User } from 'lucide-react'
import { useAuth } from '../Context/AuthContext'
import { useLang } from '../i18n/LanguageContext'
import { SetupRequired } from '../Components/SetupRequired'
import { MissingStatusChip, PriorityChip } from '../Components/StatusChips'
import { ReportMissingPartModal } from '../Components/ReportMissingPartModal'
import { getMissingParts } from '../services/missingPartsService'
import type { MissingPartDetail, MissingPartFilters } from '../Types/missingPart'
import type { MissingPartStatus, PriorityLevel } from '../Types/enums'

const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical']
const STATUSES: MissingPartStatus[] = ['open', 'waiting_purchase', 'available_in_stock', 'issued_to_production', 'installed', 'qc_pending', 'closed', 'cancelled']

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function MissingPartsPage() {
  const { t } = useLang()
  const { hasRole } = useAuth()
  const canReport = hasRole('admin', 'production', 'warehouse', 'quality')

  const [items, setItems] = useState<MissingPartDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [filters, setFilters] = useState<MissingPartFilters>({ search: '', stationNumber: '', priority: '', status: '' })
  const [showReport, setShowReport] = useState(false)
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setItems(await getMissingParts())
      setSetupRequired(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      setSetupRequired(isSchemaMissing(message))
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stationOptions = useMemo(
    () => Array.from(new Set(items.map(i => i.stationNumber).filter(Boolean))) as string[],
    [items]
  )

  const filtered = useMemo(() => {
    return items
      .filter(i => !filters.stationNumber || i.stationNumber === filters.stationNumber)
      .filter(i => !filters.priority || i.priority === filters.priority)
      .filter(i => !filters.status || i.status === filters.status)
      .filter(i => {
        const q = filters.search.trim().toLowerCase()
        if (!q) return true
        return [i.vin, i.partDescription, i.modelName].join(' ').toLowerCase().includes(q)
      })
  }, [items, filters])

  function onReported() {
    setSuccess(t('mp.success'))
    window.setTimeout(() => setSuccess(''), 2500)
    load()
  }

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <section className="space-y-5">
      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-500/15 p-3 text-red-300"><AlertTriangle className="h-6 w-6" /></div>
              <div>
                <h2 className="text-lg font-black text-white">{t('mp.title')}</h2>
                <p className="text-sm text-slate-400">{t('mp.subtitle')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700">
                <RefreshCcw className="inline h-4 w-4" />
              </button>
              {canReport && (
                <button onClick={() => setShowReport(true)} className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 sm:flex-none">
                  <PlusCircle className="mr-1 inline h-4 w-4" /> {t('mp.report')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className="input-dark" placeholder={t('mp.searchPlaceholder')} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
            <select className="input-dark" value={filters.stationNumber} onChange={e => setFilters(p => ({ ...p, stationNumber: e.target.value }))}>
              <option value="">{t('mp.filterStation')}</option>
              {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input-dark" value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value as MissingPartFilters['priority'] }))}>
              <option value="">{t('mp.filterPriority')}</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
            </select>
            <select className="input-dark" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value as MissingPartFilters['status'] }))}>
              <option value="">{t('mp.filterStatus')}</option>
              {STATUSES.map(s => <option key={s} value={s}>{t(`mpStatus.${s}`)}</option>)}
            </select>
          </div>
        </div>

        {success && <div className="m-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}
        {error && !setupRequired && <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-start">
            <thead className="bg-slate-950/90">
              <tr>
                {['vin', 'model', 'color', 'station', 'part', 'qty', 'reason', 'priority', 'status', 'createdBy', 'createdAt'].map(c => (
                  <th key={c} className="table-cell text-xs font-black uppercase text-slate-400">{t(`mp.cols.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(i => (
                <tr key={i.id} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className="table-cell font-black text-white">
                    {i.vin}
                    {i.isDrItem && <span className="mx-1 rounded bg-purple-500/20 px-1.5 text-[10px] font-bold text-purple-200">DR</span>}
                  </td>
                  <td className="table-cell">{i.modelName}</td>
                  <td className="table-cell">
                    {i.colorName ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full ring-1 ring-slate-500" style={{ backgroundColor: i.colorHex ?? '#fff' }} />
                        {i.colorName}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="table-cell">{i.stationNumber ?? '-'}</td>
                  <td className="table-cell">{i.partDescription}</td>
                  <td className="table-cell">{i.requiredQty}</td>
                  <td className="table-cell text-slate-300">{t(`reason.${i.reason}`)}</td>
                  <td className="table-cell"><PriorityChip level={i.priority} /></td>
                  <td className="table-cell"><MissingStatusChip status={i.status} /></td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <User className="h-3 w-3 text-slate-500" />
                      {i.createdByName || i.createdByEmail || '-'}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-slate-400">{new Date(i.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>}
        {!loading && filtered.length === 0 && <div className="p-8 text-center text-slate-400">{t('common.noResults')}</div>}
      </div>

      <ReportMissingPartModal open={showReport} onClose={() => setShowReport(false)} onReported={onReported} />
    </section>
  )
}
