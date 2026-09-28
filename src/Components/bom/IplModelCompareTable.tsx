import { useMemo, useState } from 'react'
import { Boxes, GitCompare, Info, Pencil } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import {
  buildIplCompareRows,
  comparePartNumbers,
  compareQuantities,
  compareStations,
  type FieldCompareResult,
  type IplCompareRow
} from '../../Utils/iplModelCompare'
import type { IplFitCounts } from '../../Utils/iplFitStatus'
import { IplCompareFieldCell } from './IplCompareFieldCell'
import { IplCompareDetailCard } from './IplCompareDetailCard'
import { IplComparePartCard, partIdFromCompareRow } from './IplComparePartCard'
import { IplModelTraitCompareModal } from './IplModelTraitCompareModal'
import { IplAllModelsFeedingModal, IplAllModelsInfoModal } from './IplAllModelsDataModals'
import { IplFitCountBadges } from './IplFitCountBadges'
import type { BomItemDetail } from '../../Types/bom'
import type { Station } from '../../Types/settings'

type Props = {
  openTabs: string[]
  itemsByModel: Map<string, BomItemDetail[]>
  rows?: IplCompareRow[]
  stations?: Station[]
  fitCountsByKey?: Map<string, IplFitCounts>
  fitModelTotal?: number
  loading?: boolean
  canUpdate?: boolean
  onEditPart?: (partId: string) => void
  onRefresh?: () => void
}

type DetailModalState = {
  title: string
  subtitle: string
  result: FieldCompareResult
  mono?: boolean
}

const EMPTY_COUNTS: IplFitCounts = { fitted: 0, notFitted: 0, unset: 0 }

export function IplModelCompareTable({
  openTabs,
  itemsByModel,
  rows: rowsProp,
  stations = [],
  fitCountsByKey,
  fitModelTotal = 0,
  loading,
  canUpdate,
  onEditPart,
  onRefresh
}: Props) {
  const { t } = useLang()
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null)
  const [partCard, setPartCard] = useState<IplCompareRow | null>(null)
  const [traitRow, setTraitRow] = useState<IplCompareRow | null>(null)
  const [infoRow, setInfoRow] = useState<IplCompareRow | null>(null)
  const [feedingRow, setFeedingRow] = useState<IplCompareRow | null>(null)
  const builtRows = useMemo(
    () => buildIplCompareRows(openTabs, itemsByModel, stations),
    [openTabs, itemsByModel, stations]
  )
  const rows = rowsProp ?? builtRows

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-black uppercase text-slate-500">
              <th className="sticky start-0 z-10 bg-slate-950 px-3 py-2 text-start">{t('bom.col.part_name_ar')}</th>
              <th className="px-3 py-2 text-start">{t('bom.col.part_name_en')}</th>
              <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
              <th className="px-3 py-2 text-center">{t('bom.station')}</th>
              <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
              <th className="px-3 py-2 text-center">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const partNumbers = comparePartNumbers(row, openTabs)
              const stations = compareStations(row, openTabs)
              const quantities = compareQuantities(row, openTabs)
              const counts = fitCountsByKey?.get(row.key) ?? EMPTY_COUNTS

              return (
                <tr
                  key={row.key}
                  className="cursor-pointer border-b border-slate-800/60 hover:bg-slate-900/40"
                  onClick={() => setPartCard(row)}
                >
                  <td className="sticky start-0 z-10 bg-slate-950/95 px-3 py-2 font-medium text-white">
                    <span className="inline-flex max-w-full flex-wrap items-center gap-y-1">
                      <span>{row.partNameAr}</span>
                      <IplFitCountBadges counts={counts} modelTotal={fitModelTotal} />
                    </span>
                  </td>
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
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title={t('bom.partInfoAction')}
                        onClick={e => {
                          e.stopPropagation()
                          setInfoRow(row)
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title={t('bom.partFeedingAction')}
                        onClick={e => {
                          e.stopPropagation()
                          setFeedingRow(row)
                        }}
                      >
                        <Boxes className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title={t('bom.iplTraitCompare')}
                        onClick={e => {
                          e.stopPropagation()
                          setTraitRow(row)
                        }}
                      >
                        <GitCompare className="h-4 w-4" />
                      </button>
                      {canUpdate && onEditPart && (
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
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-500">
        {t('bom.iplModelCompareShowing', { n: rows.length })}
      </p>

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
      <IplAllModelsInfoModal
        open={Boolean(infoRow)}
        row={infoRow}
        models={openTabs}
        canUpdate={canUpdate}
        onClose={() => setInfoRow(null)}
      />
      <IplAllModelsFeedingModal
        open={Boolean(feedingRow)}
        row={feedingRow}
        models={openTabs}
        onClose={() => setFeedingRow(null)}
      />
      <IplModelTraitCompareModal
        open={Boolean(traitRow)}
        partId={traitRow ? partIdFromCompareRow(traitRow) : null}
        partLabel={traitRow ? `${traitRow.partNameAr}${traitRow.partNameEn && traitRow.partNameEn !== '—' ? ` · ${traitRow.partNameEn}` : ''}` : ''}
        models={openTabs}
        canUpdate={canUpdate}
        onClose={() => setTraitRow(null)}
      />
      {partCard && (
        <IplComparePartCard
          open={Boolean(partCard)}
          row={partCard}
          models={openTabs}
          canUpdate={canUpdate}
          onEdit={onEditPart}
          onRefresh={onRefresh}
          onClose={() => setPartCard(null)}
        />
      )}
    </>
  )
}
