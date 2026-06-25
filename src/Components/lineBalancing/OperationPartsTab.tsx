import { useEffect, useState } from 'react'
import { Link2, Plus, Trash2, Wand2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useOperationParts } from '../../hooks/useOperationParts'
import {
  addOperationPart,
  removeOperationPart,
  searchPartsForLink,
  suggestPartsFromBom
} from '../../services/operationPartsService'
import { listOperationsForRouting } from '../../services/routingService'
import { EmptyState } from '../EmptyState'

type Props = {
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

export function OperationPartsTab({ canManage, notify }: Props) {
  const { t } = useLang()
  const [opSearch, setOpSearch] = useState('')
  const [operations, setOperations] = useState<
    { id: string; operation_name_ar: string; station_id: string; station_name: string }[]
  >([])
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null)
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const { parts, loading, reload } = useOperationParts(selectedOpId)
  const [partSearch, setPartSearch] = useState('')
  const [partHits, setPartHits] = useState<{ id: string; part_number: string; part_name_ar: string | null }[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listOperationsForRouting(opSearch)
      .then(setOperations)
      .catch(() => setOperations([]))
  }, [opSearch])

  async function onSelectOp(id: string) {
    setSelectedOpId(id)
    const op = operations.find(o => o.id === id)
    setSelectedStationId(op?.station_id ?? null)
  }

  useEffect(() => {
    if (!partSearch.trim()) {
      setPartHits([])
      return
    }
    const tmr = window.setTimeout(() => {
      searchPartsForLink(partSearch).then(setPartHits).catch(() => setPartHits([]))
    }, 300)
    return () => window.clearTimeout(tmr)
  }, [partSearch])

  async function linkPart(partId: string) {
    if (!selectedOpId || !canManage) return
    setBusy(true)
    try {
      await addOperationPart({ operation_id: selectedOpId, part_id: partId, quantity: 1 })
      setPartSearch('')
      setPartHits([])
      await reload()
      notify(t('engineering.opParts.linked'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function suggestBom() {
    if (!selectedOpId || !selectedStationId || !canManage) return
    setBusy(true)
    try {
      const suggested = await suggestPartsFromBom(selectedOpId, selectedStationId)
      let n = 0
      for (const s of suggested) {
        if (parts.some(p => p.part_id === s.part_id)) continue
        await addOperationPart({
          operation_id: selectedOpId,
          part_id: s.part_id,
          bom_item_id: s.bom_item_id,
          quantity: s.quantity
        })
        n++
      }
      await reload()
      notify(t('engineering.opParts.suggested', { n: String(n) }))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!canManage) return
    setBusy(true)
    try {
      await removeOperationPart(id)
      await reload()
      notify(t('engineering.opParts.removed'))
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-industrial p-4">
        <label className="mb-1 block text-xs font-bold text-slate-400">{t('engineering.operation')}</label>
        <input
          className="input-industrial mb-2 w-full"
          placeholder={t('engineering.searchOperation')}
          value={opSearch}
          onChange={e => setOpSearch(e.target.value)}
        />
        <select
          className="input-industrial w-full"
          value={selectedOpId ?? ''}
          onChange={e => void onSelectOp(e.target.value)}
        >
          <option value="">{t('engineering.selectOperation')}</option>
          {operations.map(o => (
            <option key={o.id} value={o.id}>
              {o.operation_name_ar} — {o.station_name}
            </option>
          ))}
        </select>
      </div>

      {selectedOpId && (
        <>
          {canManage && (
            <div className="card-industrial flex flex-wrap gap-2 p-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => void suggestBom()}
                className="btn-industrial flex items-center gap-2 bg-cyan-600/20 text-cyan-200"
              >
                <Wand2 className="h-4 w-4" />
                {t('engineering.opParts.suggestFromBom')}
              </button>
              <div className="relative min-w-[200px] flex-1">
                <input
                  className="input-industrial w-full"
                  placeholder={t('engineering.opParts.addPart')}
                  value={partSearch}
                  onChange={e => setPartSearch(e.target.value)}
                />
                {partHits.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                    {partHits.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-start text-sm hover:bg-slate-800"
                          onClick={() => void linkPart(p.id)}
                        >
                          <span className="font-mono text-cyan-300">{p.part_number}</span>
                          {p.part_name_ar && <span className="text-slate-400"> — {p.part_name_ar}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="card-industrial overflow-hidden">
            {loading ? (
              <p className="p-4 text-sm text-slate-400">{t('common.loading')}</p>
            ) : parts.length === 0 ? (
              <EmptyState icon={<Link2 className="h-8 w-8" />} title={t('engineering.opParts.empty')} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3 text-start">{t('bom.partNumber')}</th>
                    <th className="p-3 text-start">{t('bom.partName')}</th>
                    <th className="p-3">{t('bom.qty')}</th>
                    <th className="p-3">{t('engineering.usageType')}</th>
                    {canManage && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/60">
                      <td className="p-3 font-mono text-cyan-200">{p.part_number}</td>
                      <td className="p-3">{p.part_name_ar ?? '—'}</td>
                      <td className="p-3 text-center">{p.quantity}</td>
                      <td className="p-3 text-center text-xs">{p.usage_type}</td>
                      {canManage && (
                        <td className="p-3 text-end">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-red-300 hover:bg-red-500/10"
                            onClick={() => void remove(p.id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
