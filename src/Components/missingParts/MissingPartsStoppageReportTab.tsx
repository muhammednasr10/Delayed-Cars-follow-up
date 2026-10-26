import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { cell, isOpenShortageLine } from '../../Utils/missingPartPageUtils'
import { buildStoppageReportByDepartment } from '../../Utils/missingPartStats'
import { ExportableTable } from '../ExportableTable'
import type { ExcelSheet } from '../../Utils/tableExport'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  departments: MpLookupOption[]
  loading: boolean
  canExport: boolean
}

export function MissingPartsStoppageReportTab({ items, reasons, departments, loading, canExport }: Props) {
  const { t, lang } = useLang()
  const rows = useMemo(() => buildStoppageReportByDepartment(items), [items])
  const vehicleCount = useMemo(
    () => new Set(items.filter(isOpenShortageLine).map(item => item.vehicleId)).size,
    [items]
  )

  const excelSheets = useMemo((): ExcelSheet[] => {
    const deptCol = t('mp.cols.causingDepartment')
    const vehiclesCol = t('mp.summary.vehicles')
    const linesCol = t('mp.summary.lines')
    const reasonCol = t('mp.reportStoppageReason')
    const classCol = t('mp.cols.reasonClass')
    return [
      {
        name: t('mp.tabs.reportStoppage'),
        rows: [
          [deptCol, vehiclesCol, linesCol],
          ...rows.map(row => [
            mpLookupLabel(departments, row.department, lang),
            row.vehicleCount,
            row.lineCount
          ])
        ]
      },
      {
        name: t('mp.reportStoppageReasonSheet'),
        rows: [
          [deptCol, reasonCol, classCol, vehiclesCol, linesCol],
          ...rows.flatMap(row =>
            row.reasons.map(reason => [
              mpLookupLabel(departments, row.department, lang),
              reason.reason,
              mpLookupLabel(reasons, reason.reasonClass, lang),
              reason.vehicleCount,
              reason.lineCount
            ])
          )
        ]
      }
    ]
  }, [departments, lang, reasons, rows, t])

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-black text-white">{t('mp.tabs.reportStoppage')}</h3>
        <p className="mt-1 text-xs text-slate-400">{t('mp.reportStoppageHint')}</p>
        {!loading && (
          <p className="mt-2 text-sm font-black text-cyan-200">
            {t('mp.summary.vehicles')}: {vehicleCount} · {t('mp.reportStoppageDepartments', { n: rows.length })}
          </p>
        )}
      </div>

      <ExportableTable
        filename="missing-parts-stoppage-reasons"
        title={t('mp.tabs.reportStoppage')}
        rowCount={loading ? 0 : rows.length}
        showExport={canExport}
        excelSheets={excelSheets}
      >
        {loading ? (
          <p className="p-8 text-center text-slate-400">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('mp.reportStoppageEmpty')}</p>
        ) : (
          <div className="space-y-4">
            {rows.map(row => {
              const deptLabel = mpLookupLabel(departments, row.department, lang)
              return (
                <section
                  key={row.department || 'none'}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
                    <h4 className="text-sm font-black text-white">{deptLabel}</h4>
                    <p className="text-sm font-black text-cyan-200">
                      {t('mp.reportStoppageVehicles', { n: row.vehicleCount })}
                      <span className="ms-2 font-bold text-slate-500">
                        · {row.lineCount} {t('mp.summary.lines')}
                      </span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-center text-sm">
                      <thead className="bg-slate-950/80">
                        <tr>
                          <th className={`${cell} font-black uppercase text-slate-400`}>
                            {t('mp.reportStoppageReason')}
                          </th>
                          <th className={`${cell} font-black uppercase text-slate-400`}>
                            {t('mp.cols.reasonClass')}
                          </th>
                          <th className={`${cell} font-black uppercase text-slate-400`}>
                            {t('mp.summary.vehicles')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {row.reasons.map(reason => (
                          <tr key={`${reason.reason}|${reason.reasonClass}`} className="bg-slate-900/20">
                            <td className={`${cell} text-slate-100`}>{reason.reason}</td>
                            <td className={cell}>{mpLookupLabel(reasons, reason.reasonClass, lang)}</td>
                            <td className={`${cell} font-black text-cyan-300`}>{reason.vehicleCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </ExportableTable>
    </div>
  )
}
