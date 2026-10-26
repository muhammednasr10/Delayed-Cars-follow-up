import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { type FishboneCategory, type QualityNoteFishbone } from '../../Utils/qualityNoteFishbone'

const BONE_TONE: Record<FishboneCategory, string> = {
  man: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
  machine: 'border-violet-500/40 bg-violet-500/10 text-violet-100',
  method: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  material: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  measurement: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  environment: 'border-rose-500/40 bg-rose-500/10 text-rose-100'
}

const TOP: FishboneCategory[] = ['man', 'machine', 'method']
const BOTTOM: FishboneCategory[] = ['material', 'measurement', 'environment']

type Props = {
  value: QualityNoteFishbone
  problem: string
  onChange: (next: QualityNoteFishbone) => void
}

function CauseCard({
  category,
  causes,
  onAdd,
  onRemove
}: {
  category: FishboneCategory
  causes: string[]
  onAdd: (text: string) => void
  onRemove: (index: number) => void
}) {
  const { t } = useLang()
  const [draft, setDraft] = useState('')

  function submit() {
    const text = draft.trim()
    if (!text) return
    onAdd(text)
    setDraft('')
  }

  return (
    <div className={`rounded-xl border p-2.5 ${BONE_TONE[category]}`} dir="auto">
      <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wide">
        {t(`qualityNotes.fishbone.${category}`)}
      </p>
      <div className="mb-2 flex min-h-[2.5rem] flex-wrap justify-center gap-1">
        {causes.length === 0 ? (
          <span className="text-[10px] font-medium text-slate-400">{t('qualityNotes.fishbone.emptyBone')}</span>
        ) : (
          causes.map((cause, index) => (
            <span
              key={`${cause}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1 text-[11px] font-bold text-white"
            >
              <span className="truncate">{cause}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-rose-300"
                onClick={() => onRemove(index)}
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-1">
        <input
          className={`${inputCls()} py-1.5 text-xs`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t('qualityNotes.fishbone.addCause')}
        />
        <button
          type="button"
          className="rounded-lg bg-slate-950/60 p-1.5 text-white hover:bg-slate-900"
          onClick={submit}
          aria-label={t('qualityNotes.fishbone.addCause')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function QualityNoteFishboneDiagram({ value, problem, onChange }: Props) {
  const { t } = useLang()

  function patch(category: FishboneCategory, nextCauses: string[]) {
    onChange({
      v: 1,
      causes: { ...value.causes, [category]: nextCauses }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {t('qualityNotes.fishbone.title')}
      </p>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]" dir="ltr">
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {TOP.map(category => (
              <CauseCard
                key={category}
                category={category}
                causes={value.causes[category]}
                onAdd={text => patch(category, [...value.causes[category], text])}
                onRemove={index =>
                  patch(
                    category,
                    value.causes[category].filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              />
            ))}
          </div>
          <svg viewBox="0 0 640 72" className="h-16 w-full text-cyan-300" aria-hidden>
            <line x1="16" y1="36" x2="560" y2="36" stroke="currentColor" strokeWidth="4" />
            <polygon points="560,20 632,36 560,52" fill="currentColor" />
            <line x1="140" y1="8" x2="210" y2="36" stroke="currentColor" strokeWidth="2" />
            <line x1="320" y1="8" x2="370" y2="36" stroke="currentColor" strokeWidth="2" />
            <line x1="500" y1="8" x2="470" y2="36" stroke="currentColor" strokeWidth="2" />
            <line x1="140" y1="64" x2="210" y2="36" stroke="currentColor" strokeWidth="2" />
            <line x1="320" y1="64" x2="370" y2="36" stroke="currentColor" strokeWidth="2" />
            <line x1="500" y1="64" x2="470" y2="36" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className="grid gap-2 sm:grid-cols-3">
            {BOTTOM.map(category => (
              <CauseCard
                key={category}
                category={category}
                causes={value.causes[category]}
                onAdd={text => patch(category, [...value.causes[category], text])}
                onRemove={index =>
                  patch(
                    category,
                    value.causes[category].filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              />
            ))}
          </div>
        </div>
        <div className="flex min-h-[8rem] min-w-[9rem] items-center justify-center rounded-2xl border-2 border-cyan-400/70 bg-cyan-500/15 px-3 py-4 text-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-cyan-300">
              {t('qualityNotes.fishbone.problemHead')}
            </p>
            <p className="mt-1 text-sm font-black text-white">{problem || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
