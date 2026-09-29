import { inputCls } from '../FormField'
import { useWorkDaysData, delayReasonKey, formatDayLabel, formatEfficiency } from '../../hooks/useWorkDaysData'
import { PLAN_DAY_TYPES, type PlanDayType } from '../../Types/productionPlanWorkDayDaily'
import {
  computeProductivityLostCars,
  dayTypeBadgeClass,
  isActualHoursLocked,
  isVacationOrFactoryHoliday,
  resolveLaborAttendanceEfficiency,
  resolveWorkDespiteVacation
} from '../../Utils/productionPlanWorkDayDaily'
import { ProductivityBreakdownHover } from '../productivity/ProductivityBreakdownHover'
import { ProductivityDeficitCell } from '../productivity/ProductivityDeficitCell'
import { ProductivityLossReasonsModal } from '../productivity/ProductivityLossReasonsModal'

const cell = 'table-cell text-center align-middle'
const dateStickyHeader = `${cell} sticky start-0 z-10 bg-slate-950/90`
const dateStickyBody = `${cell} sticky start-0 z-10 bg-slate-900`
const dayTypeSelectCls = 'mx-auto block w-[9.5rem] shrink-0 py-1.5 text-xs font-bold text-center'

type Data = ReturnType<typeof useWorkDaysData>

function formatCount(n: number): string {
  return n ? String(n) : '—'
}

function formatLostCars(productivity: number): string {
  if (productivity <= 0) return '—'
  return String(computeProductivityLostCars(productivity))
}

export function WorkDaysMonthTable({ data: h }: { data: Data }) {
  const { t, lang, isWorkDaysOnly, canEditRows } = h

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className={`w-full text-sm ${isWorkDaysOnly ? 'min-w-[640px]' : 'min-w-[920px]'}`}>
          <thead className="bg-slate-950/90">
            {isWorkDaysOnly ? (
              <tr>
                <th className={`${dateStickyHeader} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.workDaysTab.cols.date')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.workDaysTab.cols.dayType')}</th>
                <th className={`${cell} text-xs font-black uppercase text-violet-300`}>{t('productionOrders.workDaysTab.cols.laborAttendance')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.workDaysTab.cols.plannedHours')}</th>
                <th className={`${cell} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.workDaysTab.cols.actualHours')}</th>
              </tr>
            ) : (
              <>
                <tr>
                  <th rowSpan={2} className={`${dateStickyHeader} text-xs font-black uppercase text-slate-400`}>{t('productionOrders.workDaysTab.cols.date')}</th>
                  <th colSpan={2} className={`${cell} text-xs font-black uppercase text-amber-300`}>
                    {t('productionOrders.workDaysTab.cols.totalStops')}
                    <span className="mt-0.5 block text-[10px] font-normal normal-case text-amber-200/60">{t('productionOrders.workDaysTab.stopsFromPage')}</span>
                  </th>
                  <th rowSpan={2} className={`${cell} text-xs font-black uppercase text-cyan-200`}>{t('productionOrders.workDaysTab.cols.dailyPlan')}</th>
                  <th colSpan={2} className={`${cell} text-xs font-black uppercase text-cyan-300`}>{t('productionOrders.workDaysTab.cols.entryProductivity')}</th>
                  <th colSpan={2} className={`${cell} text-xs font-black uppercase text-emerald-300`}>{t('productionOrders.workDaysTab.cols.exitProductivity')}</th>
                  <th className={`${cell} text-xs font-black uppercase text-orange-300`}>{t('productionOrders.workDaysTab.cols.repairProductivity')}</th>
                </tr>
                <tr>
                  <th className={`${cell} text-[10px] font-black uppercase text-amber-200`}>{t('productionOrders.workDaysTab.cols.stopMinutes')}</th>
                  <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-amber-200`}>{t('productionOrders.workDaysTab.cols.stopCars')}</th>
                  <th className={`${cell} text-[10px] font-black uppercase text-cyan-200`}>{t('productionOrders.workDaysTab.cols.productivityQty')}</th>
                  <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-rose-300`}>{t('productionOrders.workDaysTab.cols.deficitShort')}</th>
                  <th className={`${cell} text-[10px] font-black uppercase text-emerald-200`}>{t('productionOrders.workDaysTab.cols.productivityQty')}</th>
                  <th className={`${cell} border-e border-slate-700 text-[10px] font-black uppercase text-rose-300`}>{t('productionOrders.workDaysTab.cols.deficitShort')}</th>
                  <th className={`${cell} text-[10px] font-black uppercase text-orange-200`}>{t('productionOrders.workDaysTab.cols.productivityQty')}</th>
                </tr>
              </>
            )}
          </thead>
          <tbody className="divide-y divide-slate-800">
            {h.displayRows.map((row, index) => {
              const plannedHoursLocked = isVacationOrFactoryHoliday(row.dayType)
              const actualHoursLocked = isActualHoursLocked(row)
              const attendanceEfficiency = resolveLaborAttendanceEfficiency(row)
              const vacationWorkEnabled = resolveWorkDespiteVacation(row)
              return (
                <tr key={row.workDate} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={dateStickyBody}>
                    <span className="whitespace-nowrap font-bold text-slate-200">{formatDayLabel(row.workDate, lang)}</span>
                  </td>
                  {isWorkDaysOnly && (
                    <>
                      <td className={cell}>
                        <select
                          disabled={!canEditRows}
                          className={`${inputCls()} ${dayTypeSelectCls} ${dayTypeBadgeClass(row.dayType)}`}
                          value={row.dayType}
                          onChange={e => h.patchRow(index, { dayType: e.target.value as PlanDayType })}
                        >
                          {PLAN_DAY_TYPES.map(type => (
                            <option key={type} value={type}>{t(`productionOrders.workDaysTab.dayTypes.${type}`)}</option>
                          ))}
                        </select>
                      </td>
                      <td className={`${cell} font-black text-violet-300`}>{formatEfficiency(attendanceEfficiency)}</td>
                      <td className={cell}>
                        {plannedHoursLocked ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            disabled={!canEditRows}
                            className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                            value={row.plannedHours || ''}
                            onChange={e => h.patchRow(index, { plannedHours: Number(e.target.value) || 0 })}
                            onBlur={e => h.flushSaveRow({ ...row, plannedHours: Number(e.target.value) || 0 })}
                          />
                        )}
                      </td>
                      <td className={cell}>
                        <div className="mx-auto flex max-w-[8.5rem] items-center justify-center gap-1.5">
                          {plannedHoursLocked && canEditRows && (
                            <label className="inline-flex shrink-0 cursor-pointer items-center" title={t('productionOrders.workDaysTab.vacationWorkHint')}>
                              <input
                                type="checkbox"
                                checked={vacationWorkEnabled}
                                onChange={e => h.patchRow(index, { workDespiteVacation: e.target.checked, ...(e.target.checked ? {} : { actualHours: 0 }) })}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-violet-500 focus:ring-violet-500/40"
                              />
                            </label>
                          )}
                          {actualHoursLocked ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              disabled={!canEditRows}
                              className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm"
                              value={row.actualHours || ''}
                              onChange={e => h.patchRow(index, { actualHours: Number(e.target.value) || 0 })}
                              onBlur={e => h.flushSaveRow({ ...row, actualHours: Number(e.target.value) || 0 })}
                            />
                          )}
                        </div>
                      </td>
                    </>
                  )}
                  {!isWorkDaysOnly && (
                    <>
                      <td className={`${cell} font-black text-amber-300`}>{formatCount(row.stopMinutes)}</td>
                      <td className={`${cell} border-e border-slate-800 font-black text-amber-300`}>{formatCount(row.stopLostVehicles)}</td>
                      <td className={`${cell} font-black text-cyan-200`}>{row.dailyPlan || '—'}</td>
                      <td className={`${cell} font-black text-cyan-300`}>
                        {row.entryProductivity ? (
                          <ProductivityBreakdownHover breakdown={h.dayBreakdown(row.workDate)} kind="entry" className="text-cyan-300">{row.entryProductivity}</ProductivityBreakdownHover>
                        ) : '—'}
                      </td>
                      <td className={`${cell} border-e border-slate-800 font-black text-rose-300`}>
                        <ProductivityDeficitCell
                          deficit={row.entryDeficit}
                          display={row.dailyPlan > 0 ? String(row.entryDeficit) : formatLostCars(row.entryProductivity)}
                          workDate={row.workDate}
                          kind="entry"
                          onShowReasons={(date, kind, deficit) => h.setLossReasonsModal({ workDate: date, kind, deficit, productivity: row.entryProductivity, stopLostVehicles: row.stopLostVehicles, dailyPlan: row.dailyPlan })}
                        />
                      </td>
                      <td className={`${cell} font-black text-emerald-300`}>
                        {row.exitProductivity ? (
                          <ProductivityBreakdownHover breakdown={h.dayBreakdown(row.workDate)} kind="exit" className="text-emerald-300">{row.exitProductivity}</ProductivityBreakdownHover>
                        ) : '—'}
                      </td>
                      <td className={`${cell} border-e border-slate-800 font-black text-rose-300`}>
                        <ProductivityDeficitCell
                          deficit={row.exitDeficit}
                          display={row.dailyPlan > 0 ? String(row.exitDeficit) : formatLostCars(row.exitProductivity)}
                          workDate={row.workDate}
                          kind="exit"
                          onShowReasons={(date, kind, deficit) => h.setLossReasonsModal({ workDate: date, kind, deficit, productivity: row.exitProductivity, stopLostVehicles: row.stopLostVehicles, dailyPlan: row.dailyPlan })}
                        />
                      </td>
                      <td className={`${cell} font-black text-orange-300`}>
                        {row.repairProductivity ? (
                          <ProductivityBreakdownHover breakdown={h.dayBreakdown(row.workDate)} kind="repair" className="text-orange-300">{row.repairProductivity}</ProductivityBreakdownHover>
                        ) : '—'}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {h.rows.length > 0 && (
              <tr className="bg-slate-950/95 text-base font-black">
                <td className={`${dateStickyBody} bg-slate-950/95 text-white`}>{t('productionOrders.grandTotal')}</td>
                {isWorkDaysOnly && (
                  <>
                    <td className={cell} />
                    <td className={`${cell} text-violet-300`}>{formatEfficiency(h.totals.laborAttendanceEfficiency)}</td>
                    <td className={`${cell} text-cyan-200`}>{h.totals.plannedHours || '—'}</td>
                    <td className={`${cell} text-slate-200`}>{h.totals.actualHours || '—'}</td>
                  </>
                )}
                {!isWorkDaysOnly && (
                  <>
                    <td className={`${cell} text-amber-300`}>{formatCount(h.totals.stopMinutes)}</td>
                    <td className={`${cell} border-e border-slate-800 text-amber-300`}>{formatCount(h.totals.stopLostVehicles)}</td>
                    <td className={`${cell} text-cyan-200`}>{h.displayRows.reduce((sum, row) => sum + row.dailyPlan, 0) || '—'}</td>
                    <td className={`${cell} text-cyan-300`}>
                      {h.totals.entryProductivity ? (
                        <ProductivityBreakdownHover breakdown={h.monthBreakdown} kind="entry" className="text-cyan-300">{h.totals.entryProductivity}</ProductivityBreakdownHover>
                      ) : '—'}
                    </td>
                    <td className={`${cell} border-e border-slate-800 text-rose-300`}>
                      {h.totals.entryDeficit > 0 || h.totals.entryProductivity > 0 ? (
                        h.totals.entryDeficit > 0 ? <span className="font-black text-red-400">{h.totals.entryDeficit}</span> : h.totals.entryDeficit
                      ) : '—'}
                    </td>
                    <td className={`${cell} text-emerald-300`}>
                      {h.totals.exitProductivity ? (
                        <ProductivityBreakdownHover breakdown={h.monthBreakdown} kind="exit" className="text-emerald-300">{h.totals.exitProductivity}</ProductivityBreakdownHover>
                      ) : '—'}
                    </td>
                    <td className={`${cell} border-e border-slate-800 text-rose-300`}>
                      {h.totals.exitDeficit > 0 || h.totals.exitProductivity > 0 ? (
                        h.totals.exitDeficit > 0 ? <span className="font-black text-red-400">{h.totals.exitDeficit}</span> : h.totals.exitDeficit
                      ) : '—'}
                    </td>
                    <td className={`${cell} text-orange-300`}>
                      {h.totals.repairProductivity ? (
                        <ProductivityBreakdownHover breakdown={h.monthBreakdown} kind="repair" className="text-orange-300">{h.totals.repairProductivity}</ProductivityBreakdownHover>
                      ) : '—'}
                    </td>
                  </>
                )}
              </tr>
            )}
          </tbody>
        </table>
        {h.loading && <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>}
        {!h.loading && h.rows.length === 0 && <p className="p-8 text-center text-slate-500">{t('common.noData')}</p>}
      </div>

      {h.lossReasonsModal && (
        <ProductivityLossReasonsModal
          open
          workDate={h.lossReasonsModal.workDate}
          kind={h.lossReasonsModal.kind}
          productivity={h.lossReasonsModal.productivity}
          stopLostVehicles={h.lossReasonsModal.stopLostVehicles}
          stops={h.monthStops}
          reasons={h.delayReasonsByKey.get(delayReasonKey(h.lossReasonsModal.workDate, h.lossReasonsModal.kind)) ?? ''}
          dailyTarget={h.lossReasonsModal.dailyPlan}
          onClose={() => h.setLossReasonsModal(null)}
        />
      )}
    </>
  )
}
