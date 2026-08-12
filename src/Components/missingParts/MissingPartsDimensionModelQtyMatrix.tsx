import { useMemo, type ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import {
  buildDimensionModelRequiredQtyMatrix,
  type DimensionModelQtyMatrix
} from '../../Utils/missingPartDimensionModelQtyMatrix'
import type { MissingPartDetail } from '../../Types/missingPart'

type Props = {
  items: MissingPartDetail[]
  variant?: 'active' | 'archive'
  title: string
  hint: string
  rowHeader: string
  getDimension: (row: MissingPartDetail) => string
  /** Hide empty «—» dimension rows (e.g. missing station). */
  hideEmptyDash?: boolean
  renderDimensionLabel?: (key: string) => ReactNode
}

export function MissingPartsDimensionModelQtyMatrix({
  items,
  variant = 'active',
  title,
  hint,
  rowHeader,
  getDimension,
  hideEmptyDash = false,
  renderDimensionLabel
}: Props) {
  const { t } = useLang()
  const matrix = useMemo(() => {
    const full = buildDimensionModelRequiredQtyMatrix(items, getDimension, variant)
    if (!hideEmptyDash) return full
    const keep = full.dimensions
      .map((dim, i) => ({ dim, i }))
      .filter(({ dim }) => dim !== '—')
    if (keep.length === full.dimensions.length) return full
    return {
      dimensions: keep.map(k => k.dim),
      models: full.models,
      cellQty: keep.map(k => full.cellQty[k.i]),
      dimensionTotals: keep.map(k => full.dimensionTotals[k.i]),
      modelTotals: full.models.map((_, mi) => keep.reduce((sum, k) => sum + full.cellQty[k.i][mi], 0)),
      grandTotal: keep.reduce((sum, k) => sum + full.dimensionTotals[k.i], 0)
    } satisfies DimensionModelQtyMatrix
  }, [items, variant, getDimension, hideEmptyDash])

  if (matrix.dimensions.length === 0 || matrix.models.length === 0) {
    return (
      <div className="card-industrial overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h4 className="text-sm font-black text-slate-200">{title}</h4>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="px-4 py-10 text-center text-sm text-slate-500">{t('common.noResults')}</div>
      </div>
    )
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h4 className="text-sm font-black text-slate-200">{title}</h4>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-center text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/90">
            <tr>
              <th className="sticky start-0 z-[1] whitespace-nowrap bg-slate-950/95 px-3 py-2.5 text-start text-xs font-black uppercase text-cyan-300">
                {rowHeader}
              </th>
              {matrix.models.map(model => (
                <th key={model} className="whitespace-nowrap px-3 py-2.5 text-xs font-black uppercase text-slate-400">
                  {model}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2.5 text-xs font-black uppercase text-cyan-300">
                {t('mp.summary.total')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {matrix.dimensions.map((dim, di) => (
              <tr key={dim} className="bg-slate-900/30 hover:bg-slate-800/35">
                <td className="sticky start-0 z-[1] max-w-[16rem] bg-slate-900/95 px-3 py-2.5 text-start font-bold text-slate-100">
                  <span className="line-clamp-2">{renderDimensionLabel?.(dim) ?? dim}</span>
                </td>
                {matrix.models.map((model, mi) => {
                  const qty = matrix.cellQty[di][mi]
                  return (
                    <td key={model} className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {qty > 0 ? (
                        <span className="font-black text-white">{qty}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="whitespace-nowrap px-3 py-2.5 font-black tabular-nums text-cyan-200">
                  {matrix.dimensionTotals[di]}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-950/70">
              <td className="sticky start-0 z-[1] whitespace-nowrap bg-slate-950/95 px-3 py-2.5 text-start text-xs font-black uppercase text-cyan-300">
                {t('mp.summary.total')}
              </td>
              {matrix.models.map((model, mi) => (
                <td key={model} className="whitespace-nowrap px-3 py-2.5 font-black tabular-nums text-cyan-200">
                  {matrix.modelTotals[mi]}
                </td>
              ))}
              <td className="whitespace-nowrap px-3 py-2.5 text-lg font-black tabular-nums text-cyan-100">
                {matrix.grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
