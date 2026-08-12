import { useMemo, useState, type ReactNode } from 'react'
import { GitCompare } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import {
  buildIplCompareRows,
  comparePartNumbers,
  compareQuantities,
  compareStations,
  type FieldCompareResult,
  type IplCompareRow
} from '../../Utils/iplModelCompare'

type Props = {
  openTabs: string[]
  itemsByModel: Map<string, import('../../Types/bom').BomItemDetail[]>
  loading?: boolean
}

type DetailModalState = {
  title: string
  subtitle: string
  result: FieldCompareResult
  mono?: boolean
}

type CompareCellProps = {
  result: FieldCompareResult
  sharedLabel: string
  differentLabel: string
  mono?: boolean
  hideValuesWhenDifferent?: boolean
  onOpenDetail: () => void
}

function CompareBadge({ tone, children }: { tone: 'same' | 'different'; children: ReactNode }) {
  const cls =
    tone === 'same'
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
  return (
    <span className={`inline-block shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${cls}`}>
      {children}
    </span>
  )
}

function CompareFieldCell({
  result,
  sharedLabel,
  differentLabel,
  mono,
  hideValuesWhenDifferent,
  onOpenDetail
}: CompareCellProps) {
  if (result.status === 'missing') {
    return <span className="text-slate-600">—</span>
  }

  if (result.status === 'same') {
    return (
      <div className="inline-flex flex-wrap items-center justify-center gap-2">
        {result.sharedValue && (
          <span className={`text-xs text-cyan-200 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
            {result.sharedValue}
          </span>
        )}
        <CompareBadge tone="same">{sharedLabel}</CompareBadge>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="inline-flex flex-wrap items-center justify-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-slate-800/50"
    >
      {!hideValuesWhenDifferent &&
        result.byModel.some(e => e.value !== '—') && (
          <span className={`text-xs text-slate-400 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
            {result.byModel
              .filter(e => e.value !== '—')
              .map(e => e.value)
              .join(' / ')}
          </span>
        )}
      <CompareBadge tone="different">{differentLabel}</CompareBadge>
    </button>
  )
}

const DETAIL_VALUE_TONES = [
  'border-cyan-500/35 bg-cyan-500/12',
  'border-violet-500/35 bg-violet-500/12',
  'border-amber-500/35 bg-amber-500/12',
  'border-emerald-500/35 bg-emerald-500/12',
  'border-rose-500/35 bg-rose-500/12',
  'border-sky-500/35 bg-sky-500/12'
] as const

const DETAIL_TEXT_TONES = [
  'text-cyan-200',
  'text-violet-200',
  'text-amber-200',
  'text-emerald-200',
  'text-rose-200',
  'text-sky-200'
] as const

function detailValueKey(value: string): string {
  return value.trim().toUpperCase()
}

function isPresentDetailValue(value: string): boolean {
  const v = value.trim()
  return Boolean(v && v !== '—')
}

function buildDetailValueTones(values: string[]): Map<string, { row: string; text: string }> {
  const map = new Map<string, { row: string; text: string }>()
  let i = 0
  for (const value of values) {
    const key = detailValueKey(value)
    if (!key || map.has(key)) continue
    map.set(key, {
      row: DETAIL_VALUE_TONES[i % DETAIL_VALUE_TONES.length],
      text: DETAIL_TEXT_TONES[i % DETAIL_TEXT_TONES.length]
    })
    i++
  }
  return map
}

function CompareDetailCard({
  open,
  title,
  subtitle,
  result,
  mono,
  onClose
}: DetailModalState & { open: boolean; onClose: () => void }) {
  const { t } = useLang()

  const present = useMemo(
    () => result.byModel.filter(({ value }) => isPresentDetailValue(value)),
    [result.byModel]
  )
  const tones = useMemo(() => buildDetailValueTones(present.map(e => e.value)), [present])

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      icon={<GitCompare className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-2">
        {present.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('common.noData')}</p>
        ) : (
          present.map(({ model, value }) => {
            const tone = tones.get(detailValueKey(value))
            return (
              <div
                key={model}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${tone?.row ?? 'border-slate-800 bg-slate-950/60'}`}
              >
                <span className="text-sm font-black text-violet-300">{model}</span>
                <span
                  className={`text-sm font-bold ${tone?.text ?? 'text-white'} ${mono ? 'font-mono' : ''}`}
                  dir={mono ? 'ltr' : undefined}
                >
                  {value}
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

export function IplModelCompareTable({ openTabs, itemsByModel, loading }: Props) {
  const { t } = useLang()
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null)
  const rows = useMemo(() => buildIplCompareRows(openTabs, itemsByModel), [openTabs, itemsByModel])

  function openDetail(row: IplCompareRow, field: 'part_number' | 'station' | 'qty', result: FieldCompareResult, mono?: boolean) {
    const titles = {
      part_number: t('bom.col.part_number'),
      station: t('bom.station'),
      qty: t('bom.qtyPerCar')
    }
    setDetailModal({
      title: t('bom.iplCompareDetailTitle', { field: titles[field] }),
      subtitle: `${row.partNameAr} · ${row.partNameEn}`,
      result,
      mono
    })
  }

  if (loading) {
    return <p className="px-4 py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>
  }

  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-400">{t('bom.noModelBom')}</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="sticky start-0 z-10 bg-slate-950 px-3 py-2 text-start">{t('bom.col.part_name_ar')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.part_name_en')}</th>
              <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
              <th className="px-3 py-2 text-center">{t('bom.station')}</th>
              <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const partNumbers = comparePartNumbers(row, openTabs)
              const stations = compareStations(row, openTabs)
              const quantities = compareQuantities(row, openTabs)

              return (
                <tr key={row.key} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                  <td className="sticky start-0 z-10 bg-slate-950/95 px-3 py-2 font-medium text-white">{row.partNameAr}</td>
                  <td className="px-3 py-2 text-slate-400" dir="ltr">
                    {row.partNameEn}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CompareFieldCell
                      result={partNumbers}
                      sharedLabel={t('bom.iplComparePartNumberShared')}
                      differentLabel={t('bom.iplComparePartNumberDifferent')}
                      mono
                      hideValuesWhenDifferent
                      onOpenDetail={() => openDetail(row, 'part_number', partNumbers, true)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CompareFieldCell
                      result={stations}
                      sharedLabel={t('bom.iplCompareStationShared')}
                      differentLabel={t('bom.iplCompareStationDifferent')}
                      onOpenDetail={() => openDetail(row, 'station', stations)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CompareFieldCell
                      result={quantities}
                      sharedLabel={t('bom.iplCompareQtyShared')}
                      differentLabel={t('bom.iplCompareQtyDifferent')}
                      onOpenDetail={() => openDetail(row, 'qty', quantities)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detailModal && (
        <CompareDetailCard
          open={Boolean(detailModal)}
          title={detailModal.title}
          subtitle={detailModal.subtitle}
          result={detailModal.result}
          mono={detailModal.mono}
          onClose={() => setDetailModal(null)}
        />
      )}
    </>
  )
}
