import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { getPartById, getPartBomUsage } from '../../services/partsService'
import type { BomItemDetail, Part } from '../../Types/bom'
import { CategoryBadge } from './CategoryBadge'

type Props = {
  partId: string | null
  open: boolean
  onClose: () => void
}

export function PartDetailsModal({ partId, open, onClose }: Props) {
  const { t } = useLang()
  const [part, setPart] = useState<Part | null>(null)
  const [usage, setUsage] = useState<BomItemDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !partId) return
    setLoading(true)
    Promise.all([getPartById(partId), getPartBomUsage(partId)])
      .then(([p, u]) => {
        setPart(p)
        setUsage(u)
      })
      .finally(() => setLoading(false))
  }, [open, partId])

  return (
    <Modal open={open} title={t('bom.partDetails')} icon={<Package className="h-5 w-5" />} onClose={onClose} maxWidthClass="max-w-2xl">
      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : part ? (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">{t('bom.partNumber')}</p>
              <p className="font-black text-cyan-300" dir="ltr">
                {part.part_number}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">{t('bom.normalized')}</p>
              <p className="font-mono text-slate-300" dir="ltr">
                {part.normalized_part_number}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('bom.partName')}</p>
            <p className="text-white">{part.part_name_ar || part.part_name_en || '—'}</p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('bom.usageTitle')}</p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {usage.map(u => (
                <li key={u.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white" dir="ltr">
                      {u.station_code_text || u.station_number || '—'}
                    </span>
                    <span className="text-slate-400">{u.vehicle_model_name || u.model_family || '—'}</span>
                    <CategoryBadge label={u.bom_classification || '—'} />
                    <span className="text-orange-200">{u.quantity} {t('bom.qty')}</span>
                  </div>
                  {u.source_sheet && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {u.source_sheet} #{u.source_row_number}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-slate-400">{t('common.noData')}</p>
      )}
    </Modal>
  )
}
