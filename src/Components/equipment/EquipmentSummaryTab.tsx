import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { TableExportButtons } from '../TableExportButtons'
import { getLineEquipment } from '../../services/equipmentService'
import { EQUIPMENT_STATUSES, type LineEquipment } from '../../Types/equipment'
import type { EquipmentKind } from '../../Types/equipmentKind'
import { equipmentKindLabel } from '../../Utils/equipmentKindLabel'
import { buildEquipmentSummary } from '../../Utils/equipmentSummary'

const cell = 'table-cell text-center align-middle whitespace-nowrap px-3 py-2.5'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

type Props = {
  kinds: EquipmentKind[]
  onOpenRegistry?: () => void
}

export function EquipmentSummaryTab({ kinds, onOpenRegistry }: Props) {
  const { t, lang } = useLang()
  const tableRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<LineEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getLineEquipment())
      setSetupRequired(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error')
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => buildEquipmentSummary(items, kinds), [items, kinds])

  function kindName(code: string) {
    const fromCatalog = equipmentKindLabel(code, kinds, lang, '')
    if (fromCatalog) return fromCatalog
    const key = `equipment.types.${code}`
    const translated = t(key)
    return translated === key ? code : translated
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-sky-200">{t('equipment.summary.title')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('equipment.summary.hint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableExportButtons
            filename={t('equipment.summary.title')}
            title={t('equipment.summary.title')}
            containerRef={tableRef}
            disabled={loading || stats.byKind.length === 0}
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-slate-800 px-3 py-2 text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold">{t('equipment.setupTitle')}</p>
          <p className="mt-1 text-amber-200/80">{t('equipment.setupHint')}</p>
        </div>
      )}
      {error && !setupRequired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatPill label={t('equipment.summary.total')} value={String(stats.total)} tone="sky" />
        <StatPill label={t('equipment.status.active')} value={String(stats.byStatus.active)} tone="emerald" />
        <StatPill
          label={t('equipment.status.calibration_due')}
          value={String(stats.byStatus.calibration_due)}
          tone="amber"
        />
        <StatPill
          label={t('equipment.status.out_of_service')}
          value={String(stats.byStatus.out_of_service)}
          tone="red"
        />
        <StatPill label={t('equipment.status.scrapped')} value={String(stats.byStatus.scrapped)} tone="slate" />
      </div>

      <div className="card-industrial overflow-x-auto" ref={tableRef}>
        <table className="w-full text-center text-sm">
          <thead className="bg-slate-950/90">
            <tr>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.cols.equipmentType')}</th>
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.summary.total')}</th>
              {EQUIPMENT_STATUSES.map(status => (
                <th key={status} className={`${cell} font-black text-slate-400`}>
                  {t(`equipment.status.${status}`)}
                </th>
              ))}
              <th className={`${cell} font-black text-slate-400`}>{t('equipment.summary.assigned')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-slate-500">
                  {t('common.loading')}
                </td>
              </tr>
            ) : stats.byKind.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-slate-500">
                  {t('equipment.empty')}
                </td>
              </tr>
            ) : (
              stats.byKind.map(row => (
                <tr key={row.code} className="bg-slate-900/30 hover:bg-slate-800/40">
                  <td className={cell}>
                    {onOpenRegistry ? (
                      <button
                        type="button"
                        className="font-black text-sky-200 hover:underline"
                        onClick={onOpenRegistry}
                      >
                        {kindName(row.code)}
                      </button>
                    ) : (
                      <span className="font-black text-slate-100">{kindName(row.code)}</span>
                    )}
                  </td>
                  <td className={`${cell} font-black text-white`}>{row.total}</td>
                  {EQUIPMENT_STATUSES.map(status => (
                    <td key={status} className={`${cell} text-slate-200`}>
                      {row.byStatus[status]}
                    </td>
                  ))}
                  <td className={`${cell} text-slate-200`}>{row.assigned}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: 'sky' | 'emerald' | 'amber' | 'red' | 'slate'
}) {
  const tones = {
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    red: 'border-red-500/30 bg-red-500/10 text-red-100',
    slate: 'border-slate-600/50 bg-slate-800/50 text-slate-200'
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}
