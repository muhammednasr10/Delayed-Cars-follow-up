import { useEffect, useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { Station } from '../../Types/settings'
import { getStations } from '../../services/settingsService'
import { qualityTransferStations, stationOptionLabel } from '../../Utils/qualityTransferStations'

type Props = {
  part: MissingPartDetail | null
  busy?: boolean
  onConfirm: (part: MissingPartDetail, stationId: string) => void
  onClose: () => void
}

export function TransferToQualityModal({ part, busy = false, onConfirm, onClose }: Props) {
  const { t } = useLang()
  const [stations, setStations] = useState<Station[]>([])
  const [stationId, setStationId] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!part) {
      setStationId('')
      setLoadError('')
      return
    }
    void getStations()
      .then(list => {
        const quality = qualityTransferStations(list)
        setStations(quality)
        setStationId(prev => (prev && quality.some(s => s.id === prev) ? prev : quality[0]?.id ?? ''))
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : String(err)))
  }, [part])

  if (!part) return null

  return (
    <Modal
      open
      title={t('mp.workflow.transferTitle')}
      subtitle={part.vin}
      icon={<ArrowRightLeft className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
      zIndexClass="z-[180]"
      footer={
        <button
          type="button"
          disabled={busy || !stationId}
          onClick={() => onConfirm(part, stationId)}
          className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? '...' : t('mp.workflow.submitTransfer')}
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-300">{t('mp.workflow.transferHint', { reason: part.partDescription })}</p>
        {loadError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">{loadError}</p>
        )}
        <label className="block text-xs font-bold text-slate-400">
          {t('mp.workflow.qualityStation')}
          <select
            className="input-dark mt-1 w-full text-sm font-black text-white"
            value={stationId}
            onChange={e => setStationId(e.target.value)}
          >
            {stations.length === 0 && <option value="">{t('mp.workflow.noQualityStations')}</option>}
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {stationOptionLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}
