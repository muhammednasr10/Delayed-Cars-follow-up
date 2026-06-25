import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { StopperChip } from '../StatusChips'
import { getStopperExclusions } from '../../services/bomStopperService'
import type { BomItemDetail } from '../../Types/bom'
import type { StopperType } from '../../Types/enums'
import { effectiveBomStopperType } from '../../Utils/bomStopper'

type Props = {
  item: BomItemDetail | null
  open: boolean
  onClose: () => void
}

export function BomStopperExclusionsModal({ item, open, onClose }: Props) {
  const { t } = useLang()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exclusions, setExclusions] = useState<
    Awaited<ReturnType<typeof getStopperExclusions>>['exclusions']
  >([])
  const [zoningNote, setZoningNote] = useState<string | null>(null)
  const stopper = item ? effectiveBomStopperType(item) : 'non_stopper'

  useEffect(() => {
    if (!open || !item || stopper === 'non_stopper') return
    setLoading(true)
    setError('')
    getStopperExclusions(item)
      .then(res => {
        setExclusions(res.exclusions)
        setZoningNote(res.zoningNote)
      })
      .catch(e => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [open, item, stopper, t])

  if (!item) return null

  return (
    <Modal
      open={open}
      title={t('bom.stopperExclusionsTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-500">{t('bom.stopperExclusionsPart')}</p>
          <p className="font-bold text-white">{item.part_name_ar || item.part_number}</p>
          <p className="font-mono text-xs text-slate-400" dir="ltr">
            {item.part_number}
          </p>
          <div className="mt-2">
            <StopperChip type={stopper as StopperType} />
          </div>
        </div>

        <p className="text-slate-300">
          {stopper === 'line_stopper' ? t('bom.stopperExclusionsLineHint') : t('bom.stopperExclusionsCarHint')}
        </p>

        {zoningNote && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            <p className="mb-1 font-bold">{t('bom.stopperZoningNote')}</p>
            <p className="whitespace-pre-wrap">{zoningNote}</p>
          </div>
        )}

        {loading && <p className="text-slate-400">{t('common.loading')}</p>}
        {error && <p className="text-red-300">{error}</p>}

        {!loading && !error && exclusions.length === 0 && (
          <p className="text-slate-500">{t('bom.stopperExclusionsEmpty')}</p>
        )}

        {!loading && exclusions.length > 0 && (
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-800 p-2">
            {exclusions.map(ex => (
              <li
                key={`${ex.part_number}-${ex.station_code ?? ''}`}
                className="rounded-lg bg-slate-900/60 px-3 py-2"
              >
                <p className="font-bold text-slate-100">{ex.part_name_ar || ex.part_number}</p>
                <p className="font-mono text-xs text-cyan-300/90" dir="ltr">
                  {ex.part_number}
                  {ex.station_code ? ` · ${ex.station_code}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
