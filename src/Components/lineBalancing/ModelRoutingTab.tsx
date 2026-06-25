import { useEffect, useState } from 'react'
import { Route } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useModelRouting } from '../../hooks/useModelRouting'
import { deactivateModelRouting, listOperationsForRouting, upsertModelRouting } from '../../services/routingService'
import type { VehicleModel } from '../../Types/settings'

type Props = {
  models: VehicleModel[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

export function ModelRoutingTab({ models, canManage, notify }: Props) {
  const { t } = useLang()
  const [modelId, setModelId] = useState('')
  const { rows, loading, reload } = useModelRouting(modelId || null)
  const [busy, setBusy] = useState(false)
  const [addOpId, setAddOpId] = useState('')
  const [ops, setOps] = useState<
    { id: string; operation_name_ar: string; station_id: string; station_name: string }[]
  >([])

  async function loadOps() {
    try {
      setOps(await listOperationsForRouting(''))
    } catch {
      setOps([])
    }
  }

  useEffect(() => {
    void loadOps()
  }, [])

  async function addRoute() {
    if (!modelId || !addOpId || !canManage) return
    const op = ops.find(o => o.id === addOpId)
    if (!op) return
    setBusy(true)
    try {
      await upsertModelRouting({
        vehicle_model_id: modelId,
        station_id: op.station_id,
        operation_id: op.id,
        sequence_no: rows.length + 1
      })
      setAddOpId('')
      await reload()
      notify(t('engineering.routing.saved'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <label className="mb-1 block text-xs font-bold text-slate-400">{t('engineering.routing.title')}</label>
        <select
          className="input-industrial w-full max-w-md"
          value={modelId}
          onChange={e => setModelId(e.target.value)}
        >
          <option value="">{t('bom.selectModel')}</option>
          {models.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {modelId && canManage && (
        <div className="card-industrial flex flex-wrap gap-2 p-4">
          <select
            className="input-industrial min-w-[240px] flex-1"
            value={addOpId}
            onFocus={() => void loadOps()}
            onChange={e => setAddOpId(e.target.value)}
          >
            <option value="">{t('engineering.selectOperation')}</option>
            {ops.map(o => (
              <option key={o.id} value={o.id}>
                {o.operation_name_ar} — {o.station_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !addOpId}
            className="btn-industrial bg-violet-500 text-slate-950"
            onClick={() => void addRoute()}
          >
            {t('common.add')}
          </button>
        </div>
      )}

      {modelId && (
        <div className="card-industrial overflow-hidden">
          {loading ? (
            <p className="p-4 text-slate-400">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="flex items-center gap-2 p-4 text-slate-400">
              <Route className="h-5 w-5" />
              {t('common.noData')}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3">#</th>
                  <th className="p-3 text-start">{t('bom.station')}</th>
                  <th className="p-3 text-start">{t('engineering.operation')}</th>
                  <th className="p-3">{t('engineering.timeStudy.standard')}</th>
                  <th className="p-3">{t('engineering.timeStudy.manpower')}</th>
                  <th className="p-3">{t('engineering.timeStudy.takt')}</th>
                  {canManage && <th className="p-3" />}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-slate-800/50">
                    <td className="p-3 text-center">{r.sequence_no}</td>
                    <td className="p-3">
                      {r.station_number} {r.station_name}
                    </td>
                    <td className="p-3">{r.operation_name_ar}</td>
                    <td className="p-3 text-center">
                      {r.standard_time_seconds != null ? `${r.standard_time_seconds}s` : '—'}
                    </td>
                    <td className="p-3 text-center">{r.required_manpower_count}</td>
                    <td className="p-3 text-center">
                      {r.takt_time_seconds != null ? `${r.takt_time_seconds}s` : '—'}
                    </td>
                    {canManage && (
                      <td className="p-3 text-end">
                        <button
                          type="button"
                          className="text-xs text-red-300 hover:underline"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true)
                            try {
                              await deactivateModelRouting(r.id)
                              await reload()
                            } finally {
                              setBusy(false)
                            }
                          }}
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
