import type { ReactNode } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { isIplCompareFitToken, type FieldCompareResult } from '../../Utils/iplModelCompare'
import { formatIplCompareValue, IplFitStatusChip } from './IplFitStatusChip'

type Props = {
  result: FieldCompareResult
  differentLabel: string
  mono?: boolean
  hideValuesWhenDifferent?: boolean
  onOpenDetail: () => void
}

function CompareBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200 hover:bg-amber-500/20">
      {children}
    </span>
  )
}

export function IplCompareFieldCell({ result, differentLabel, mono, hideValuesWhenDifferent, onOpenDetail }: Props) {
  const { t } = useLang()
  if (result.status === 'missing') return <span className="text-slate-600">—</span>

  if (result.status === 'same') {
    if (!result.sharedValue) return <span className="text-slate-600">—</span>
    if (isIplCompareFitToken(result.sharedValue)) return <IplFitStatusChip value={result.sharedValue} />
    return (
      <span className={`text-xs text-cyan-200 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
        {formatIplCompareValue(result.sharedValue, t)}
      </span>
    )
  }

  const uniqueFitted = [
    ...new Set(
      result.byModel
        .filter(e => e.value !== '—' && !isIplCompareFitToken(e.value))
        .map(e => formatIplCompareValue(e.value, t))
    )
  ]

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        onOpenDetail()
      }}
      className="inline-flex flex-wrap items-center justify-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-slate-800/50"
    >
      {!hideValuesWhenDifferent && uniqueFitted.length > 0 && (
        <span className={`text-xs text-slate-400 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
          {uniqueFitted.join(' / ')}
        </span>
      )}
      <CompareBadge>{differentLabel}</CompareBadge>
    </button>
  )
}
