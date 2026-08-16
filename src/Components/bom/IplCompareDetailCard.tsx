import { useMemo } from 'react'
import { GitCompare } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { isIplCompareFitToken, type FieldCompareResult } from '../../Utils/iplModelCompare'
import { formatIplCompareValue, iplCompareTokenClass } from './IplFitStatusChip'

type Props = {
  open: boolean
  title: string
  subtitle: string
  result: FieldCompareResult
  mono?: boolean
  onClose: () => void
}

type PartValueTone = {
  backgroundColor: string
  borderColor: string
  accent: string
  textColor: string
}

function hsla(h: number, s: number, l: number, a = 1) {
  return `hsla(${Math.round(h)}, ${s}%, ${l}%, ${a})`
}

function detailValueKey(value: string): string {
  return value.trim().toUpperCase()
}

function buildDetailValueTones(values: string[]): Map<string, PartValueTone> {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const key = detailValueKey(value)
    if (!key || seen.has(key) || isIplCompareFitToken(value)) continue
    seen.add(key)
    keys.push(key)
  }

  const n = keys.length
  const map = new Map<string, PartValueTone>()
  keys.forEach((key, i) => {
    const h = n <= 1 ? 188 : (188 + (i * 360) / n) % 360
    map.set(key, {
      backgroundColor: hsla(h, 32, 16, 0.92),
      borderColor: hsla(h, 28, 48, 0.38),
      accent: hsla(h, 40, 58),
      textColor: hsla(h, 28, 82)
    })
  })
  return map
}

export function IplCompareDetailCard({ open, title, subtitle, result, mono, onClose }: Props) {
  const { t } = useLang()
  const present = useMemo(
    () => result.byModel.filter(({ value }) => value.trim() && value !== '—'),
    [result.byModel]
  )
  const tones = useMemo(() => buildDetailValueTones(present.map(e => e.value)), [present])
  const uniqueValues = useMemo(() => [...new Set(present.map(e => detailValueKey(e.value)))], [present])
  const showLegend = uniqueValues.length > 1

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      icon={<GitCompare className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      {showLegend && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 p-2.5">
          {uniqueValues.map(key => {
            const sample = present.find(e => detailValueKey(e.value) === key)?.value ?? key
            const token = isIplCompareFitToken(sample)
            const tone = tones.get(key)
            return (
              <span
                key={key}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${
                  token ? iplCompareTokenClass(sample) : ''
                } ${mono && !token ? 'font-mono' : ''}`}
                dir={mono && !token ? 'ltr' : undefined}
                title={formatIplCompareValue(sample, t)}
                style={
                  token
                    ? undefined
                    : {
                        backgroundColor: tone?.backgroundColor,
                        borderColor: tone?.borderColor,
                        color: tone?.textColor,
                        borderInlineStartWidth: 3,
                        borderInlineStartColor: tone?.accent
                      }
                }
              >
                {!token && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone?.accent }} />
                )}
                <span className="truncate">{formatIplCompareValue(sample, t)}</span>
              </span>
            )
          })}
        </div>
      )}
      <div className="space-y-2">
        {present.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('common.noData')}</p>
        ) : (
          present.map(({ model, value }) => {
            const token = isIplCompareFitToken(value)
            const tone = tones.get(detailValueKey(value))
            return (
              <div
                key={model}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${token ? iplCompareTokenClass(value) : ''}`}
                style={
                  token
                    ? undefined
                    : {
                        backgroundColor: tone?.backgroundColor,
                        borderColor: tone?.borderColor,
                        borderInlineStartWidth: 4,
                        borderInlineStartColor: tone?.accent
                      }
                }
              >
                <span className="shrink-0 text-sm font-black text-slate-300">{model}</span>
                <span
                  className={`inline-flex min-w-0 items-center gap-2 text-sm font-black ${mono && !token ? 'font-mono' : ''}`}
                  dir={mono && !token ? 'ltr' : undefined}
                  style={token ? undefined : { color: tone?.textColor }}
                >
                  {!token && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone?.accent }} />
                  )}
                  <span className="truncate">{formatIplCompareValue(value, t)}</span>
                </span>
              </div>
            )
          })
        )}
      </div>
      <p className="mt-4 text-center text-[10px] text-slate-600">{t('bom.iplCompareDetailHint')}</p>
    </Modal>
  )
}
