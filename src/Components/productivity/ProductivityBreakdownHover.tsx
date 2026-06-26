import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../../i18n/LanguageContext'
import type { ModelProductivityBreakdownRow } from '../../Utils/productivityBreakdown'

type Props = {
  breakdown: ModelProductivityBreakdownRow[]
  kind: 'entry' | 'exit'
  children: ReactNode
  className?: string
}

export function ProductivityBreakdownHover({ breakdown, kind, children, className = '' }: Props) {
  const { t } = useLang()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const rows = breakdown
    .map(row => ({
      modelId: row.modelId,
      modelLabel: row.modelLabel,
      qty: kind === 'entry' ? row.entry : row.exit
    }))
    .filter(row => row.qty > 0)

  if (rows.length === 0) {
    return <span className={className}>{children}</span>
  }

  function showCard() {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2
    })
    setOpen(true)
  }

  const title =
    kind === 'entry'
      ? t('productionOrders.workDaysTab.breakdown.entryTitle')
      : t('productionOrders.workDaysTab.breakdown.exitTitle')
  const qtyLabel =
    kind === 'entry'
      ? t('productionOrders.workDaysTab.breakdown.entry')
      : t('productionOrders.workDaysTab.breakdown.exit')
  const qtyTone = kind === 'entry' ? 'text-cyan-200' : 'text-emerald-200'

  return (
    <>
      <span
        ref={anchorRef}
        className={`cursor-help underline decoration-dotted decoration-slate-500 underline-offset-2 ${className}`}
        onMouseEnter={showCard}
        onMouseLeave={() => setOpen(false)}
        onFocus={showCard}
        onBlur={() => setOpen(false)}
        tabIndex={0}
      >
        {children}
      </span>

      {open &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[200] w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-start shadow-2xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="mb-2 text-xs font-black text-slate-300">{title}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-1.5 text-start font-bold">{t('productionOrders.workDaysTab.breakdown.model')}</th>
                  <th className={`pb-1.5 text-center font-bold ${qtyTone}`}>{qtyLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.modelId} className="border-b border-slate-800/80 last:border-0">
                    <td className="py-1.5 pe-2 font-bold text-slate-100">{row.modelLabel}</td>
                    <td className={`py-1.5 text-center font-mono ${qtyTone}`}>{row.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
          document.body
        )}
    </>
  )
}
