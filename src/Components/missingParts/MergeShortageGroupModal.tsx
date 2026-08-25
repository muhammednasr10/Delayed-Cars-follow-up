import { GitMerge } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { MergeIssueOption } from '../../Utils/mergeShortageReportGroup'

type Props = {
  open: boolean
  options: MergeIssueOption[]
  vehicleCount: number
  busy?: boolean
  onClose: () => void
  onConfirm: (primaryIssueKey: string) => void
}

export function MergeShortageGroupModal({ open, options, vehicleCount, busy, onClose, onConfirm }: Props) {
  const { t } = useLang()
  const [selectedKey, setSelectedKey] = useState(options[0]?.key ?? '')

  useEffect(() => {
    if (!open) return
    setSelectedKey(options[0]?.key ?? '')
  }, [open, options])

  if (!open) return null

  return (
    <Modal
      open={open}
      title={t('mp.bulk.merge.pickTitle')}
      subtitle={t('mp.bulk.merge.pickSubtitle', { n: vehicleCount })}
      icon={<GitMerge className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={busy || !selectedKey}
            onClick={() => onConfirm(selectedKey)}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {t('mp.bulk.merge.action')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-400">{t('mp.bulk.merge.pickHint')}</p>
        <div className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto pe-1">
          {options.map(opt => {
            const active = opt.key === selectedKey
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedKey(opt.key)}
                className={`w-full rounded-xl border px-3 py-3 text-start transition ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                    : 'border-slate-700 bg-slate-950/50 text-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="font-bold">{opt.label}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-500">
                  {t('mp.bulk.merge.optionMeta', { vehicles: opt.vehicleCount, lines: opt.lineCount })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
