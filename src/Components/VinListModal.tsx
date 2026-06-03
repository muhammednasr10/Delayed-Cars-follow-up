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
      maxWidthClass="max-w-md"
    >
      {(modelName || colorName) && (
        <p className="mb-3 text-center text-sm text-slate-400">
          {modelName}
          {colorName ? ` · ${colorName}` : ''}
        </p>
      )}
      <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        {vins.map((vin, i) => (
          <li key={vin} className="flex items-center gap-2 font-mono text-sm text-white" dir="ltr">
            <span className="w-6 shrink-0 text-right text-[10px] font-bold text-slate-500">{i + 1}.</span>
            {vin}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
