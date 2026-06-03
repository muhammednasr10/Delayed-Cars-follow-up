import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  title: string
  subtitle?: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidthClass?: string
}

// Elegant centered card modal used across the app (add / edit forms, etc.).
// Rendered through a portal to <body> so ancestor `backdrop-filter` / `transform`
// containers (e.g. .card-industrial) can't clip the fixed overlay or its footer.
export function Modal({ open, title, subtitle, icon, onClose, children, footer, maxWidthClass = 'max-w-lg' }: ModalProps) {
  if (!open) return null

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`my-auto flex max-h-[90vh] w-full ${maxWidthClass} animate-[fadeIn_0.15s_ease-out] flex-col rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-2xl shadow-black/40`}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            {icon && <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">{icon}</div>}
            <div>
              <h3 className="text-lg font-black text-white">{title}</h3>
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-900/95 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
