import { useDeferredValue, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  buildIplCompareRows,
  comparePartNumbers,
  compareQuantities,
  compareStations,
  type FieldCompareResult,
  type IplCompareRow
} from '../../Utils/iplModelCompare'
import { IplCompareFieldCell } from './IplCompareFieldCell'
import { IplCompareDetailCard } from './IplCompareDetailCard'
import { IplComparePartCard, partIdFromCompareRow } from './IplComparePartCard'
import type { BomItemDetail } from '../../Types/bom'

type Props = {
  openTabs: string[]
  itemsByModel: Map<string, BomItemDetail[]>
  loading?: boolean
  canUpdate?: boolean
  onEditPart?: (partId: string) => void
}

type DetailModalState = {
  title: string
  subtitle: string
  result: FieldCompareResult
  mono?: boolean
}

export function IplModelCompareTable({ openTabs, itemsByModel, loading, canUpdate, onEditPart }: Props) {
  const { t } = useLang()
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null)
  const [partCard, setPartCard] = useState<IplCompareRow | null>(null)
  const deferredTabs = useDeferredValue(openTabs)
  const deferredItems = useDeferredValue(itemsByModel)
  const rows = useMemo(() => buildIplCompareRows(deferredTabs, deferredItems), [deferredTabs, deferredItems])
  const pending = deferredTabs !== openTabs || deferredItems !== itemsByModel

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

  if (loading && rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>
  }

  if (rows.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-400">{t('bom.noModelBom')}</p>
  }

  return (
    <>
      <div className={`overflow-x-auto transition-opacity duration-200 ${pending ? 'opacity-70' : 'opacity-100'}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="sticky start-0 z-10 bg-slate-950 px-3 py-2 text-start">{t('bom.col.part_name_ar')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.part_name_en')}</th>
              <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
              <th className="px-3 py-2 text-center">{t('bom.station')}</th>
              <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
              {canUpdate && onEditPart && <th className="px-3 py-2 text-center">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const partNumbers = comparePartNumbers(row, deferredTabs)
              const stations = compareStations(row, deferredTabs)
              const quantities = compareQuantities(row, deferredTabs)

              return (
                <tr
                  key={row.key}
                  className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-900/40"
                  onClick={() => setPartCard(row)}
                >
                  <td className="sticky start-0 z-10 bg-slate-950/95 px-3 py-2 font-medium text-white">{row.partNameAr}</td>
                  <td className="px-3 py-2 text-slate-400" dir="ltr">
                    {row.partNameEn}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <IplCompareFieldCell
                      result={partNumbers}
                      differentLabel={t('bom.iplComparePartNumberDifferent')}
                      mono
                      hideValuesWhenDifferent
                      onOpenDetail={() => openDetail(row, 'part_number', partNumbers, true)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <IplCompareFieldCell
                      result={stations}
                      differentLabel={t('bom.iplCompareStationDifferent')}
                      onOpenDetail={() => openDetail(row, 'station', stations)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <IplCompareFieldCell
                      result={quantities}
                      differentLabel={t('bom.iplCompareQtyDifferent')}
                      onOpenDetail={() => openDetail(row, 'qty', quantities)}
                    />
                  </td>
                  {canUpdate && onEditPart && (
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title={t('bom.partListEdit')}
                        onClick={e => {
                          e.stopPropagation()
                          const partId = partIdFromCompareRow(row)
                          if (partId) onEditPart(partId)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detailModal && (
        <IplCompareDetailCard
          open={Boolean(detailModal)}
          title={detailModal.title}
          subtitle={detailModal.subtitle}
          result={detailModal.result}
          mono={detailModal.mono}
          onClose={() => setDetailModal(null)}
        />
      )}
      {partCard && (
        <IplComparePartCard
          open={Boolean(partCard)}
          row={partCard}
          models={deferredTabs}
          canUpdate={canUpdate}
          onEdit={onEditPart}
          onClose={() => setPartCard(null)}
        />
      )}
    </>
  )
}
