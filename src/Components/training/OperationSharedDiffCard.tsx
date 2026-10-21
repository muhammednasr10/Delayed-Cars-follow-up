import { useState } from 'react'
import { ChevronDown, GitCompare } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import type { FieldCompareResult } from '../../Utils/iplModelCompare'
import { formatIplCompareValue, iplCompareTokenClass, isIplCompareFitToken } from '../bom/IplFitStatusChip'
import type { OperationHardware } from '../../Types/timeStudy'
import type { OperationClassCompare } from '../../Utils/operationIplCompare'

type ClassSection = {
  label: string
  result: FieldCompareResult
  mono?: boolean
  colorByValue?: boolean
}

type Props =
  | {
      kind: 'classification'
      open: boolean
      title: string
      subtitle: string
      sections: ClassSection[]
      onClose: () => void
    }
  | {
      kind: 'hardware'
      open: boolean
      title: string
      subtitle: string
      hardware: OperationHardware[]
      compare?: OperationClassCompare | null
      onClose: () => void
    }

function StatusChip({ status }: { status: FieldCompareResult['status'] }) {
  const { t } = useLang()
  if (status === 'missing') return <span className="text-slate-500">—</span>
  if (status === 'same') {
    return (
      <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-200">
        {t('operations.sharedDiff.shared')}
      </span>
    )
  }
  return (
    <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-200">
      {t('operations.sharedDiff.different')}
    </span>
  )
}

/** Stable tint per shared value so matching part numbers read as one group. */
const VALUE_TINTS = [
  'border-cyan-500/35 bg-cyan-500/15',
  'border-violet-500/35 bg-violet-500/15',
  'border-amber-500/35 bg-amber-500/15',
  'border-emerald-500/35 bg-emerald-500/15',
  'border-rose-500/35 bg-rose-500/15',
  'border-sky-500/35 bg-sky-500/15',
  'border-fuchsia-500/35 bg-fuchsia-500/15',
  'border-orange-500/35 bg-orange-500/15',
  'border-teal-500/35 bg-teal-500/15',
  'border-lime-500/35 bg-lime-500/15'
] as const

function valueTintClass(value: string): string {
  const key = value.trim().toUpperCase()
  if (!key) return 'border-slate-800/80 bg-slate-900/60'
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return VALUE_TINTS[hash % VALUE_TINTS.length]
}

function rowToneClass(value: string, colorByValue: boolean): string {
  if (isIplCompareFitToken(value)) return iplCompareTokenClass(value)
  if (colorByValue) return valueTintClass(value)
  return 'border-slate-800/80 bg-slate-900/60'
}

function SectionBlock({ label, result, mono, colorByValue = false }: ClassSection) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  const rows = result.byModel.filter(entry => entry.value.trim() && entry.value !== '—')

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start transition hover:bg-slate-900/60"
        aria-expanded={expanded}
        onClick={() => setExpanded(current => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
          <span className="text-xs font-black text-slate-200">{label}</span>
        </span>
        <StatusChip status={result.status} />
      </button>
      {expanded ? (
        <div className="space-y-1.5 border-t border-slate-800 px-3 py-2.5">
          {result.status === 'same' && result.sharedValue && !isIplCompareFitToken(result.sharedValue) ? (
            <p className={`mb-1 text-sm font-bold text-cyan-200 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
              {formatIplCompareValue(result.sharedValue, t)}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p className="text-xs text-slate-500">{t('common.noData')}</p>
          ) : (
            rows.map(entry => (
              <div
                key={entry.model}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${rowToneClass(
                  entry.value,
                  colorByValue
                )}`}
              >
                <span className="text-xs font-bold text-slate-400" dir="ltr">
                  {entry.model}
                </span>
                <span
                  className={`text-xs font-black text-slate-100 ${mono && !isIplCompareFitToken(entry.value) ? 'font-mono' : ''}`}
                  dir={mono ? 'ltr' : undefined}
                >
                  {formatIplCompareValue(entry.value, t)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}

export function OperationSharedDiffCard(props: Props) {
  const { t } = useLang()
  return (
    <Modal
      open={props.open}
      title={props.title}
      subtitle={props.subtitle}
      icon={<GitCompare className="h-5 w-5" />}
      onClose={props.onClose}
      maxWidthClass="max-w-md"
    >
      {props.kind === 'classification' ? (
        <div className="space-y-3">
          {props.sections.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            props.sections.map(section => (
              <SectionBlock
                key={section.label}
                {...section}
                colorByValue={section.colorByValue ?? Boolean(section.mono)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {props.compare ? (
            <>
              <SectionBlock
                label={t('bom.col.part_number')}
                result={props.compare.partNumber}
                mono
                colorByValue
              />
              <SectionBlock label={t('bom.qtyPerCar')} result={props.compare.quantity} />
            </>
          ) : null}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-500">{t('operations.cols.hardware')}</p>
            {props.hardware.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">{t('common.noData')}</p>
            ) : (
              props.hardware.map(item => (
                <div
                  key={item.id || item.hardwareName}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
                >
                  <div className="min-w-0 text-start">
                    <p className="font-mono text-xs font-black text-cyan-200" dir="ltr">
                      {item.hardwareName}
                    </p>
                    {item.hardwareSize ? <p className="truncate text-[11px] text-slate-400">{item.hardwareSize}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-black text-slate-200" dir="ltr">
                    ×{item.hardwareQty ?? 1}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
