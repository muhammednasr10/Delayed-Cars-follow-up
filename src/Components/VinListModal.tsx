import { Hash } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { Modal } from './Modal'

type Props = {
  vins: string[] | null
  modelName?: string
  colorName?: string | null
  onClose: () => void
}

export function VinListModal({ vins, modelName, colorName, onClose }: Props) {
  const { t } = useLang()
  if (!vins?.length) return null

  return (
    <Modal
      open={Boolean(vins?.length)}
      title={t('mp.vinListModal.title')}
      subtitle={t('mp.vinListModal.subtitle', { n: vins.length })}
      icon={<Hash className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      {(modelName || colorName) && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-center">
          <p className="text-sm font-bold text-white">{modelName}</p>
          {colorName && <p className="mt-1 text-xs text-slate-400">{colorName}</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {vins.map((vin, i) => (
          <div
            key={`${vin}-${i}`}
            className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3 py-3 text-center shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase text-slate-500">{i + 1}</p>
            <p className="mt-1 font-mono text-base font-black text-cyan-100" dir="ltr">
              {vin}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  )
}
