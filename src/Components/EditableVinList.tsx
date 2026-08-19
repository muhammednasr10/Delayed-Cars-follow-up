import { Plus, Trash2 } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { normalizeVinKey, sanitizeChassisDigits, duplicateVinIndices } from '../Utils/vinListConflict'

type Props = {
  vins: string[]
  /** When true, the row cannot be edited or removed. */
  isLocked?: (vin: string, index: number) => boolean
  title?: string
  hint?: string
  addLabel?: string
  onAdd: () => void
  onChange: (index: number, next: string) => void
  onRemove: (index: number) => void
  /** Fired when digits reach 4 or on blur with a complete VIN. */
  onVinReady: (index: number, vin: string) => void
  /** Fired when the previous complete/partial value is overwritten or the row is removed. */
  onVinDiscarded?: (prevVinKey: string) => void
}

export function EditableVinList({
  vins,
  isLocked,
  title,
  hint,
  addLabel,
  onAdd,
  onChange,
  onRemove,
  onVinReady,
  onVinDiscarded
}: Props) {
  const { t } = useLang()
  const duplicateIdx = duplicateVinIndices(vins)

  return (
    <section className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          {title && <p className="text-[10px] font-bold uppercase text-slate-500">{title}</p>}
          {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel ?? t('mp.edit.addVin')}
        </button>
      </div>
      <div className="space-y-2">
        {vins.map((vin, i) => {
          const locked = isLocked?.(vin, i) ?? false
          const isDuplicate = duplicateIdx.has(i)
          return (
            <div key={`${locked ? 'L' : 'U'}-${i}`} className="flex gap-2">
              <input
                className={`input-dark min-w-0 flex-1 font-mono ${
                  isDuplicate ? 'border-red-500 text-red-300 focus:border-red-400 focus:ring-red-400/20' : ''
                }`}
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                value={vin}
                disabled={locked}
                aria-invalid={isDuplicate || undefined}
                title={isDuplicate ? t('mp.errDuplicateVin') : undefined}
                onChange={e => {
                  const next = sanitizeChassisDigits(e.target.value)
                  const prevKey = normalizeVinKey(vin)
                  if (prevKey && prevKey !== next) onVinDiscarded?.(prevKey)
                  onChange(i, next)
                  if (next.length === 4) onVinReady(i, next)
                }}
                onBlur={() => onVinReady(i, vin)}
                placeholder="0000"
              />
              {!locked && (
                <button
                  type="button"
                  onClick={() => {
                    const key = normalizeVinKey(vin)
                    if (key) onVinDiscarded?.(key)
                    onRemove(i)
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
