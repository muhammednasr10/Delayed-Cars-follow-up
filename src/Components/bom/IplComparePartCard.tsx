import { Package, Pencil } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import {
  IPL_COMPARE_NOT_FITTED,
  IPL_COMPARE_UNSET,
  iplFitStatusForModel,
  type IplCompareRow
} from '../../Utils/iplModelCompare'
import { iplDisplayPartNumber } from '../../Utils/iplModelParts'
import { displayBomStationCode } from '../../Utils/bomStationCode'
import { modelQtyForBomRow } from '../../Utils/bomQtyByModel'
import {
  iplFeedingCardFromBomItem,
  normalizePackingType,
  normalizePartDirection
} from '../../Utils/iplBomLogistics'
import { labelForPartKindValue, labelForSupplySourceValue } from '../../Utils/bomPresetOptions'
import type { BomItemDetail } from '../../Types/bom'
import { IplFitStatusChip } from './IplFitStatusChip'

type Props = {
  open: boolean
  row: IplCompareRow
  models: string[]
  canUpdate?: boolean
  onEdit?: (partId: string) => void
  onClose: () => void
}

function CardField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value.trim()) return null
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold text-slate-100 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
        {value}
      </p>
    </div>
  )
}

export function pickRichestBomItem(items: BomItemDetail[]): BomItemDetail | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => {
    const score = (x: BomItemDetail) =>
      [
        x.part_number,
        x.station_code_text,
        x.part_type,
        x.supply_source,
        x.feeding_method,
        x.packing,
        x.part_length,
        x.notes
      ].filter(v => String(v ?? '').trim()).length
    return score(b) - score(a)
  })[0]
}

export function partIdFromCompareRow(row: IplCompareRow): string | null {
  const items = [...row.byModel.values()]
  return pickRichestBomItem(items)?.part_id ?? items[0]?.part_id ?? null
}

export function IplComparePartCard({ open, row, models, canUpdate, onEdit, onClose }: Props) {
  const { t } = useLang()
  const present = models
    .map(model => ({ model, item: row.byModel.get(model) }))
    .filter((x): x is { model: string; item: BomItemDetail } => Boolean(x.item))
  const fittedItems = present.filter(p => iplFitStatusForModel(p.item, p.model) === 'fitted').map(p => p.item)
  const sample = pickRichestBomItem(fittedItems)
  const feeding = sample ? iplFeedingCardFromBomItem(sample) : null
  const packing = feeding ? normalizePackingType(feeding.packing) : ''
  const direction = feeding ? normalizePartDirection(feeding.part_direction) : ''
  const packingLabel =
    packing === 'carton'
      ? t('bom.iplLogistics.packingCarton')
      : packing === 'bin'
        ? t('bom.iplLogistics.packingBin')
        : packing === 'bag'
          ? t('bom.iplLogistics.packingBag')
          : packing === 'part'
            ? t('bom.iplLogistics.packingPart')
            : feeding?.packing ?? ''
  const directionLabel =
    direction === 'ي' ? t('bom.iplLogistics.directionRight') : direction === 'ش' ? t('bom.iplLogistics.directionLeft') : direction
  const stopper =
    feeding?.stopper_type === 'line_stopper'
      ? t('bom.stopperLine')
      : feeding?.stopper_type === 'car_stopper'
        ? t('bom.stopperCar')
        : feeding?.stopper_type
          ? t('bom.stopperNone')
          : ''

  return (
    <Modal
      open={open}
      title={t('bom.partDetails')}
      subtitle={`${row.partNameAr}${row.partNameEn && row.partNameEn !== '—' ? ` · ${row.partNameEn}` : ''}`}
      icon={<Package className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footer={
        canUpdate && onEdit ? (
          <button
            type="button"
            onClick={() => {
              const partId = partIdFromCompareRow(row)
              if (!partId) return
              onClose()
              onEdit(partId)
            }}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
          >
            <Pencil className="inline h-4 w-4" /> {t('bom.partListEdit')}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CardField label={t('bom.col.part_name_ar')} value={row.partNameAr} />
          <CardField label={t('bom.col.part_name_en')} value={row.partNameEn === '—' ? '' : row.partNameEn} />
          {sample && (
            <>
              <CardField
                label={t('bom.col.part_kind')}
                value={sample.part_type ? labelForPartKindValue(sample.part_type, k => t(k)) : ''}
              />
              <CardField
                label={t('bom.col.supply_source')}
                value={sample.supply_source ? labelForSupplySourceValue(sample.supply_source, k => t(k)) : ''}
              />
              <CardField label={t('bom.stopperType')} value={stopper} />
              <CardField label={t('bom.categoryName')} value={sample.category_name_ar ?? ''} />
              <CardField label={t('bom.iplLogistics.feeding_method')} value={feeding?.feeding_method ?? ''} />
              <CardField label={t('bom.iplLogistics.packing')} value={packingLabel} />
              <CardField label={t('bom.iplLogistics.part_direction')} value={directionLabel} />
              <CardField label={t('bom.iplLogistics.carton_qty')} value={feeding?.carton_qty ?? ''} />
              <CardField
                label={t('bom.iplLogistics.part_length')}
                value={feeding?.part_length ? `${feeding.part_length} ${t('bom.iplLogistics.unitCm')}` : ''}
              />
              <CardField
                label={t('bom.iplLogistics.part_width')}
                value={feeding?.part_width ? `${feeding.part_width} ${t('bom.iplLogistics.unitCm')}` : ''}
              />
              <CardField
                label={t('bom.iplLogistics.part_height')}
                value={feeding?.part_height ? `${feeding.part_height} ${t('bom.iplLogistics.unitCm')}` : ''}
              />
              <CardField
                label={t('bom.iplLogistics.part_volume')}
                value={feeding?.part_volume ? `${feeding.part_volume} ${t('bom.iplLogistics.unitM3')}` : ''}
              />
              <CardField
                label={t('bom.iplLogistics.part_weight')}
                value={feeding?.part_weight ? `${feeding.part_weight} ${t('bom.iplLogistics.unitKg')}` : ''}
              />
              <CardField
                label={t('bom.iplLogistics.carton_weight')}
                value={feeding?.carton_weight ? `${feeding.carton_weight} ${t('bom.iplLogistics.unitKg')}` : ''}
              />
              <CardField label={t('bom.iplLogistics.rack_code')} value={feeding?.rack_code ?? ''} />
              <CardField label={t('common.notes')} value={sample.notes ?? ''} />
            </>
          )}
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase text-cyan-300">{t('bom.iplPartCardModels')}</p>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase text-slate-500">
                  <th className="px-3 py-2 text-start">{t('bom.iplPartCardModel')}</th>
                  <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
                  <th className="px-3 py-2 text-center">{t('bom.station')}</th>
                  <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
                </tr>
              </thead>
              <tbody>
                {present.map(({ model, item }) => {
                  const status = iplFitStatusForModel(item, model)
                  if (status !== 'fitted') {
                    return (
                      <tr key={model} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-3 py-2 font-black text-slate-200">{model}</td>
                        <td className="px-3 py-2 text-center" colSpan={3}>
                          <IplFitStatusChip
                            value={status === 'not_fitted' ? IPL_COMPARE_NOT_FITTED : IPL_COMPARE_UNSET}
                          />
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={model} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-3 py-2 font-black text-slate-200">{model}</td>
                      <td className="px-3 py-2 text-center font-mono text-cyan-200" dir="ltr">
                        {iplDisplayPartNumber(item.part_number) || '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-200">
                        {displayBomStationCode(item.station_code_text) || item.station_code_text || '—'}
                      </td>
                      <td className="px-3 py-2 text-center font-black text-white">
                        {modelQtyForBomRow(item, model) || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  )
}
