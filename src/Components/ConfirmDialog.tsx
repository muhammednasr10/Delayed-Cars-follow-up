import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  extraLabel?: string
  extraBusy?: boolean
  extraBusyLabel?: string
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
  onExtra?: () => void
}

// Elegant centered confirmation card, replaces window.confirm for sensitive actions.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  extraLabel,
  extraBusy = false,
  extraBusyLabel = '...',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  onExtra
}: ConfirmDialogProps) {
  const confirmClasses =
    tone === 'danger' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'

  return (
    <Modal
      open={open}
      title={title}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onCancel}
      maxWidthClass="max-w-md"
      zIndexClass="z-[200]"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          {extraLabel && onExtra && (
            <button
              type="button"
              disabled={extraBusy || busy}
              onClick={onExtra}
              className="rounded-xl border border-cyan-500/40 bg-slate-900 px-4 py-2 font-bold text-cyan-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {extraBusy ? extraBusyLabel : extraLabel}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2 font-black transition disabled:opacity-50 ${confirmClasses}`}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{message}</p>
    </Modal>
  )
}
