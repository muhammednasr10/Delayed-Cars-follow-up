import { useMemo, useState } from 'react'
import { FileUp, Kanban, RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { ExportableTable } from '../ExportableTable'
import { parseSpreadsheetFile } from '../../Utils/parseSpreadsheet'
import { parseKanbanFeedingRows } from '../../Utils/kanbanFeedingImport'
import {
  computeKanbanBoard,
  splitIntoFeedingTrips,
  totalTripsPerShift
} from '../../Utils/kanbanReplenishment'
import { useFeedingScenarioSettings } from '../../hooks/useFeedingScenarioSettings'
import { useKanbanCalculationBasis } from '../../hooks/usePlanningWorkSchedule'
import { formatShiftRange } from '../../Utils/workScheduleDefaults'
import type { KanbanPartInput } from '../../Types/kanbanFeeding'

const cell = 'table-cell text-center align-middle text-xs sm:text-sm'

type Props = {
  notify: (msg: string, isError?: boolean) => void
}

export function WarehouseKanbanTab({ notify }: Props) {
  const { t } = useLang()
  const { scenario } = useFeedingScenarioSettings()
  const { basis, schedule } = useKanbanCalculationBasis(scenario)
  const [parts, setParts] = useState<KanbanPartInput[]>([])
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')

  const results = useMemo(() => computeKanbanBoard(parts, basis), [parts, basis])
  const trips = useMemo(() => splitIntoFeedingTrips(parts), [parts])
  const tripsPerShift = useMemo(() => totalTripsPerShift(results), [results])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return results
    return results.filter(
      r =>
        r.partNumber.toLowerCase().includes(q) ||
        r.partName.toLowerCase().includes(q) ||
        r.stationCode.toLowerCase().includes(q)
    )
  }, [results, search])

  async function onFilePick(file: File) {
    setImporting(true)
    try {
      const rows = await parseSpreadsheetFile(file)
      const { parts: imported, skipped } = parseKanbanFeedingRows(rows)
      if (imported.length === 0) {
        notify(t('warehouses.kanban.importNoRows'), true)
        return
      }
      setParts(imported)
      notify(t('warehouses.kanban.importDone', { n: imported.length, skipped }))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setImporting(false)
    }
  }

  function formatMinutes(m: number): string {
    if (!m || m <= 0) return '—'
    if (m >= 60) return `${(m / 60).toFixed(1)} ${t('warehouses.kanban.hours')}`
    return `${Math.round(m)} ${t('warehouses.kanban.minutes')}`
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
              <Kanban className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{t('warehouses.kanban.title')}</h3>
              <p className="text-sm text-slate-400">{t('warehouses.kanban.subtitle')}</p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-violet-400">
            <FileUp className="h-4 w-4" />
            {importing ? t('common.loading') : t('warehouses.kanban.import')}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={importing}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void onFilePick(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        <p className="mb-3 text-xs text-slate-500">{t('warehouses.kanban.importHint')}</p>

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          <span>
            {t('warehouses.feeding.settings.jph')}:{' '}
            <strong className="text-violet-200">{basis.jph}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span dir="ltr">
            {t('warehouses.feeding.settings.shiftTimes')}:{' '}
            <strong className="text-slate-200">{formatShiftRange(schedule.shiftStart, schedule.shiftEnd)}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            {t('warehouses.feeding.settings.safetyFactor')}:{' '}
            <strong className="text-violet-200">{scenario.safetyFactor}</strong>
          </span>
        </div>

        {parts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2">
              <p className="text-xs text-violet-200/80">{t('warehouses.kanban.stats.parts')}</p>
              <p className="text-xl font-black text-violet-100">{parts.length}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
              <p className="text-xs text-cyan-200/80">{t('warehouses.kanban.stats.tripsPerShift')}</p>
              <p className="text-xl font-black text-cyan-100">{tripsPerShift}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-200/80">{t('warehouses.kanban.stats.feedingTrips')}</p>
              <p className="text-xl font-black text-amber-100">{trips.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <p className="text-xs text-emerald-200/80">{t('warehouses.kanban.stats.lotHours')}</p>
              <p className="text-xl font-black text-emerald-100">
                {basis.jph > 0 ? (basis.lotSize / basis.jph).toFixed(1) : '—'}h
              </p>
            </div>
          </div>
        )}
      </div>

      {parts.length > 0 && (
        <>
          <div className="card-industrial overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
              <h4 className="font-black text-white">{t('warehouses.kanban.boardTitle')}</h4>
              <div className="flex gap-2">
                <input
                  className="input-dark w-48"
                  placeholder={t('common.search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setParts([])}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCcw className="inline h-4 w-4" />
                </button>
              </div>
            </div>

            <ExportableTable filename="kanban-feeding" title={t('warehouses.kanban.title')} rowCount={filtered.length}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] text-sm">
                  <thead className="bg-slate-950/90">
                    <tr>
                      {[
                        'partNo',
                        'qv',
                        'direction',
                        'rackQty',
                        'cartonQty',
                        'consumption',
                        'rackCoverage',
                        'replenFreq',
                        'reorderPoint',
                        'safetyStock',
                        'tripsRefill',
                        'tripsLot'
                      ].map(col => (
                        <th key={col} className={`${cell} px-2 py-2 text-[10px] font-black uppercase text-slate-400`}>
                          {t(`warehouses.kanban.cols.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filtered.map(row => (
                      <tr key={row.partNumber} className="bg-slate-900/30 hover:bg-slate-800/40">
                        <td className={`${cell} px-2 font-mono font-bold text-white`} dir="ltr">
                          <div>{row.partNumber}</div>
                          {row.partName && <div className="text-[10px] font-normal text-slate-500">{row.partName}</div>}
                        </td>
                        <td className={cell}>{row.qtyPerVehicle}</td>
                        <td className={cell}>{row.rackDirection}</td>
                        <td className={`${cell} font-bold text-violet-300`}>{row.rackQty}</td>
                        <td className={cell}>{row.cartonQty}</td>
                        <td className={`${cell} text-cyan-300`}>{row.consumptionPerHour}/h</td>
                        <td className={cell}>{formatMinutes(row.rackCoverageMinutes)}</td>
                        <td className={`${cell} font-bold text-amber-300`}>{formatMinutes(row.replenishmentFreqMinutes)}</td>
                        <td className={`${cell} font-bold text-rose-300`}>{row.reorderPointQty}</td>
                        <td className={cell}>{row.safetyStockQty}</td>
                        <td className={cell}>{row.tripsPerRackRefill}</td>
                        <td className={cell}>{row.tripsForLot}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExportableTable>
          </div>

          <div className="card-industrial overflow-hidden">
            <div className="border-b border-slate-800 p-4">
              <h4 className="font-black text-white">{t('warehouses.kanban.tripsTitle')}</h4>
              <p className="text-xs text-slate-500">{t('warehouses.kanban.tripsHint')}</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map(trip => (
                <div key={trip.tripIndex} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                  <p className="mb-2 text-sm font-black text-violet-300">
                    {t('warehouses.kanban.trip', { n: trip.tripIndex })} · {trip.totalUnits} {t('warehouses.kanban.units')}
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-400">
                    {trip.parts.map(p => (
                      <li key={p.partNumber} className="flex justify-between gap-2">
                        <span className="truncate font-mono text-slate-300" dir="ltr">
                          {p.partNumber}
                        </span>
                        <span className="shrink-0 text-amber-300">{p.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {parts.length === 0 && (
        <div className="card-industrial p-12 text-center text-slate-500">
          <Kanban className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p>{t('warehouses.kanban.empty')}</p>
        </div>
      )}
    </div>
  )
}
