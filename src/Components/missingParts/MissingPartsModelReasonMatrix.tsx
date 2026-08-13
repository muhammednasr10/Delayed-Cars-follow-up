import { useMemo } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { mpLookupLabel } from '../../Utils/mpLookupLabel'
import { buildModelReasonMatrix } from '../../Utils/missingPartModelReasonMatrix'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { MpLookupOption } from '../../Types/mpLookup'

type Props = {
  items: MissingPartDetail[]
  reasons: MpLookupOption[]
  variant?: 'active' | 'archive'
  /** Compact strip under list filters (no card chrome). */
  compact?: boolean
}

export function MissingPartsModelReasonMatrix({
  items,
  reasons,
  variant = 'active',
  compact = false
}: Props) {
  const { t, lang } = useLang()
  const matrix = useMemo(() => buildModelReasonMatrix(items, variant), [items, variant])

  if (matrix.models.length === 0 || matrix.reasonCodes.length === 0) {
    if (compact) return null
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
        {t('common.noResults')}
      </div>
    )
  }

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-center text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/80">
          <tr>
            <th className="sticky start-0 z-[1] whitespace-nowrap bg-slate-950/95 px-3 py-2.5 text-xs font-black uppercase text-cyan-300">
              {t('mp.cols.model')}
            </th>
            {matrix.reasonCodes.map(code => (
              <th
                key={code}
                className="max-w-[9rem] whitespace-nowrap px-3 py-2.5 text-xs font-black uppercase text-slate-400"
                title={mpLookupLabel(reasons, code, lang)}
              >
                <span className="mx-auto block truncate">{mpLookupLabel(reasons, code, lang)}</span>
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-2.5 text-xs font-black uppercase text-cyan-300">
              {t('mp.modelReasonMatrix.total')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {matrix.models.map((model, mi) => (
            <tr key={model} className="bg-slate-900/30 hover:bg-slate-800/40">
              <td className="sticky start-0 z-[1] whitespace-nowrap bg-slate-900/95 px-3 py-2.5 font-bold text-white">
                {model}
              </td>
              {matrix.reasonCodes.map((code, ri) => {
                const vehicles = matrix.cellVehicles[mi][ri]
                const lines = matrix.cellLines[mi][ri]
                return (
                  <td
                    key={code}
                    className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-200"
                    title={t('mp.modelReasonMatrix.cellHint', { vehicles, lines })}
                  >
                    {vehicles > 0 ? (
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="font-black text-white">{vehicles}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {t('mp.modelReasonMatrix.linesShort', { n: lines })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )
              })}
              <td className="whitespace-nowrap px-3 py-2.5 font-black tabular-nums text-cyan-200">
                {matrix.modelVehicleTotals[mi]}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-950/70">
            <td className="sticky start-0 z-[1] whitespace-nowrap bg-slate-950/95 px-3 py-2.5 text-xs font-black uppercase text-cyan-300">
              {t('mp.modelReasonMatrix.total')}
            </td>
            {matrix.reasonCodes.map((code, ri) => (
              <td key={code} className="whitespace-nowrap px-3 py-2.5 font-black tabular-nums text-cyan-200">
                {matrix.reasonVehicleTotals[ri]}
              </td>
            ))}
            <td className="whitespace-nowrap px-3 py-2.5 text-lg font-black tabular-nums text-cyan-100">
              {matrix.grandVehicles}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  if (compact) {
    return (
      <div className="mb-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
        <div className="border-b border-slate-800 px-4 py-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
            {t('mp.modelReasonMatrix.title')}
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-500">{t('mp.modelReasonMatrix.hint')}</p>
        </div>
        {table}
      </div>
    )
  }

  return (
    <div className="card-industrial overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-3">
        <h4 className="text-sm font-black text-slate-200">{t('mp.modelReasonMatrix.title')}</h4>
        <p className="mt-1 text-xs text-slate-500">{t('mp.modelReasonMatrix.hint')}</p>
      </div>
      {table}
    </div>
  )
}
