import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { useLang } from '../i18n/LanguageContext'
import type { VinConflictChoice } from '../Utils/vinListConflict'

export type { VinConflictChoice }

type Props = {
  vin: string | null
  onChoose: (choice: VinConflictChoice) => void
}

export function VinConflictDialog({ vin, onChoose }: Props) {
  const { t } = useLang()
  if (!vin) return null

  return (
    <Modal
      open={Boolean(vin)}
      title={t('mp.edit.vinConflictTitle')}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={() => onChoose('skip')}
      maxWidthClass="max-w-md"
      zIndexClass="z-[120]"
      footer={
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => onChoose('move')}
            className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400"
          >
            {t('mp.edit.vinConflictMove')}
          </button>
          <button
            type="button"
            onClick={() => onChoose('keep')}
            className="w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-600"
          >
            {t('mp.edit.vinConflictKeep')}
          </button>
          <button
            type="button"
            onClick={() => onChoose('skip')}
            className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700"
          >
            {t('mp.edit.vinConflictSkip')}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-300">
        {t('mp.edit.vinConflictMessage', { vin })}
      </p>
    </Modal>
  )
}
