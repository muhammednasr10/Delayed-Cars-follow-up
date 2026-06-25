import { useCallback, useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { listOperationTrainingSummaries } from '../../services/trainingIntegrationService'
import type { OperationTrainingSummary } from '../../services/trainingIntegrationService'
import type { Station } from '../../Types/settings'
import { inputCls } from '../FormField'

type Props = {
  stations: Station[]
}

export function OperationQualificationTab({ stations }: Props) {
  const { t } = useLang()
  const [stationId, setStationId] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<OperationTrainingSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listOperationTrainingSummaries(stationId || undefined))
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = rows.filter(r => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      r.operationNameAr.toLowerCase().includes(q) ||
      r.operationCode.toLowerCase().includes(q) ||
      r.stationNumber.toLowerCase().includes(q)
    )
  })

  const noSkill = filtered.filter(r => !r.skillId).length
  const noQualified = filtered.filter(r => r.skillId && r.qualifiedCount === 0).length

  return (
    <div className="space-y-4">
      <div className="card-industrial flex flex-wrap gap-3 p-4">
        <label className="min-w-[180px] flex-1">
          <span className="mb-1 block text-xs text-slate-500">{t('training.opsQual.station')}</span>
          <select className={inputCls()} value={stationId} onChange={e => setStationId(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.station_number} {s.station_name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-slate-500">{t('common.search')}</span>
          <input
            className={inputCls()}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('training.opsQual.searchPh')}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t('training.opsQual.total')} value={filtered.length} />
        <Stat label={t('training.opsQual.noSkill')} value={noSkill} warn={noSkill > 0} />
        <Stat label={t('training.opsQual.noQualified')} value={noQualified} warn={noQualified > 0} />
      </div>

      <div className="card-industrial overflow-hidden">
        {loading ? (
          <p className="p-4 text-slate-400">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-slate-400">{t('common.noData')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3 text-start">{t('engineering.operation')}</th>
                <th className="p-3 text-start">{t('bom.station')}</th>
                <th className="p-3">{t('training.opsQual.required')}</th>
                <th className="p-3">{t('training.opsQual.qualified')}</th>
                <th className="p-3">{t('training.opsQual.inTraining')}</th>
                <th className="p-3">{t('engineering.timeStudy.standard')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.operationId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-3">
                    <p className="font-bold text-white">{r.operationNameAr}</p>
                    <p className="font-mono text-xs text-slate-500">{r.operationCode}</p>
                  </td>
                  <td className="p-3 text-slate-300">
                    {r.stationNumber} {r.stationName}
                  </td>
                  <td className="p-3 text-center text-xs">{r.requiredLevel}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`font-black ${r.qualifiedCount > 0 ? 'text-emerald-300' : 'text-amber-300'}`}
                    >
                      {r.qualifiedCount}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-400">{r.inTrainingCount}</td>
                  <td className="p-3 text-center font-mono text-cyan-200">
                    {r.standardTimeSeconds != null ? `${r.standardTimeSeconds}s` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${warn ? 'bg-amber-500/10' : 'bg-slate-800/80'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-black ${warn ? 'text-amber-200' : 'text-cyan-200'}`}>{value}</p>
    </div>
  )
}
