import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Elegant centered confirmation card, replaces window.confirm for sensitive actions.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-500 text-white hover:bg-red-400'
      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'

  return (
    <Modal
      open={open}
      title={title}
      icon={<AlertTriangle className="h-5 w-5" />}
      onClose={onCancel}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button onClick={onCancel} className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700">
            {cancelLabel}
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2 font-black transition disabled:opacity-50 ${confirmClasses}`}
          >
            {busy ? '...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-300">{message}</p>
    </Modal>
  )
}
