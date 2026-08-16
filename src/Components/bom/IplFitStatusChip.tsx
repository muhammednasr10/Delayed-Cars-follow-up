import { useLang } from '../../i18n/LanguageContext'
import { IPL_COMPARE_NOT_FITTED, IPL_COMPARE_UNSET, isIplCompareFitToken } from '../../Utils/iplFitStatus'

export function formatIplCompareValue(value: string, t: (k: string) => string): string {
  if (value === IPL_COMPARE_UNSET) return t('bom.iplFitUnset')
  if (value === IPL_COMPARE_NOT_FITTED) return t('bom.iplFitNo')
  return value
}

export function iplCompareTokenClass(value: string): string {
  if (value === IPL_COMPARE_UNSET) return 'border-slate-600/50 bg-slate-800/80 text-slate-400'
  if (value === IPL_COMPARE_NOT_FITTED) return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
  return ''
}

export function IplFitStatusChip({ value }: { value: string }) {
  const { t } = useLang()
  const cls = iplCompareTokenClass(value)
  if (!cls) return null
  return (
    <span className={`inline-block shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black ${cls}`}>
      {formatIplCompareValue(value, t)}
    </span>
  )
}

export { isIplCompareFitToken }
