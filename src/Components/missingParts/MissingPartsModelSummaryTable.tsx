import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { VehicleModel } from '../../Types/settings'
import { buildFamilyVehicleCounts, type FamilyVehicleCountRow } from '../../Utils/missingPartPageUtils'
import { getVehicleModels } from '../../services/settingsService'
import { MissingPartFamilyVariantsModal } from './MissingPartFamilyVariantsModal'

type Props = {
  items: MissingPartDetail[]
}

export function MissingPartsModelSummaryTable({ items }: Props) {
  const { t } = useLang()
  const [models, setModels] = useState<VehicleModel[]>([])
  const [expandedFamily, setExpandedFamily] = useState<FamilyVehicleCountRow | null>(null)

  useEffect(() => {
    getVehicleModels()
      .then(setModels)
      .catch(() => setModels([]))
  }, [])

  const summary = useMemo(() => buildFamilyVehicleCounts(items, models), [items, models])

  if (summary.total === 0) return null

  return (
    <>
      <div className="mb-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
        <table className="w-full min-w-max text-center text-sm">
          <thead className="border-b border-slate-800 bg-slate-950/80">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-xs font-black uppercase text-cyan-300">
                {t('mp.modelSummary.total')}
              </th>
              {summary.byFamily.map(row => (
                <th
                  key={row.familyId}
                  className="whitespace-nowrap px-4 py-2.5 text-xs font-black uppercase text-slate-400"
                >
                  {row.familyName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="whitespace-nowrap px-4 py-3 text-lg font-black tabular-nums text-cyan-200">
                {summary.total}
              </td>
              {summary.byFamily.map(row => (
                <td key={row.familyId} className="whitespace-nowrap px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedFamily(row)}
                    className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-base font-black tabular-nums text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
                    title={t('mp.modelSummary.openVariants')}
                  >
                    {row.count}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <MissingPartFamilyVariantsModal family={expandedFamily} onClose={() => setExpandedFamily(null)} />
    </>
  )
}
