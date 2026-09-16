import { useLang } from '../../i18n/LanguageContext'
import type { IplFitCounts } from '../../Utils/iplFitStatus'

type Props = {
  counts?: IplFitCounts | null
  modelTotal?: number
}

const EMPTY: IplFitCounts = { fitted: 0, notFitted: 0, unset: 0 }

export function IplFitCountBadges({ counts, modelTotal = 0 }: Props) {
  const { t } = useLang()
  const { fitted, notFitted, unset } = counts ?? EMPTY
  const title = [
    t('bom.iplFitYesCount', { n: fitted }),
    t('bom.iplFitNoCount', { n: notFitted }),
    t('bom.iplFitUnsetCount', { n: unset }),
    t('bom.iplFitScopeTotal', { n: modelTotal })
  ].join(' · ')

  return (
    <span className="ms-1.5 inline-flex flex-wrap items-center gap-1 align-middle" title={title}>
      <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-200">
        {t('bom.iplFitYesShort', { n: fitted })}
      </span>
      <span className="inline-flex items-center rounded-md border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
        {t('bom.iplFitNoShort', { n: notFitted })}
      </span>
      <span className="inline-flex items-center rounded-md border border-slate-600/50 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-black text-slate-400">
        {t('bom.iplFitUnsetShort', { n: unset })}
      </span>
    </span>
  )
}
