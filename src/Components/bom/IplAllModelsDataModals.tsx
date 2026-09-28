import { Boxes, ImagePlus, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { iplFeedingCardFromBomItem, normalizePackingType, normalizePartDirection } from '../../Utils/iplBomLogistics'
import { labelForPartKindValue, labelForSupplySourceValue } from '../../Utils/bomPresetOptions'
import { getPartById, partImageUrl, uploadPartImage } from '../../services/partsService'
import { partIdFromCompareRow } from './IplComparePartCard'
import { IplFitStatusChip } from './IplFitStatusChip'
import type { BomItemDetail } from '../../Types/bom'

type Props = {
  open: boolean
  row: IplCompareRow | null
  models: string[]
  canUpdate?: boolean
  onClose: () => void
}

function presentModels(row: IplCompareRow | null, models: string[]) {
  if (!row) return []
  return models
    .map(model => ({ model, item: row.byModel.get(model) }))
    .filter((entry): entry is { model: string; item: BomItemDetail } => Boolean(entry.item))
}

function packingLabel(value: string, t: (key: string) => string): string {
  const packing = normalizePackingType(value)
  if (packing === 'carton') return t('bom.iplLogistics.packingCarton')
  if (packing === 'bin') return t('bom.iplLogistics.packingBin')
  if (packing === 'bag') return t('bom.iplLogistics.packingBag')
  if (packing === 'part') return t('bom.iplLogistics.packingPart')
  return value
}

function directionLabel(value: string, t: (key: string) => string): string {
  const direction = normalizePartDirection(value)
  if (direction === 'ي') return t('bom.iplLogistics.directionRight')
  if (direction === 'ش') return t('bom.iplLogistics.directionLeft')
  return direction
}

function stopperLabel(item: BomItemDetail, t: (key: string) => string): string {
  const feeding = iplFeedingCardFromBomItem(item)
  if (feeding.stopper_type === 'line_stopper') return t('bom.stopperLine')
  if (feeding.stopper_type === 'car_stopper') return t('bom.stopperCar')
  if (feeding.stopper_type) return t('bom.stopperNone')
  return ''
}

function partSubtitle(row: IplCompareRow | null): string {
  if (!row) return ''
  return `${row.partNameAr}${row.partNameEn && row.partNameEn !== '—' ? ` · ${row.partNameEn}` : ''}`
}

export function IplAllModelsInfoModal({ open, row, models, canUpdate, onClose }: Props) {
  const { t } = useLang()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const partId = row ? partIdFromCompareRow(row) : null
  const lines = presentModels(row, models)

  useEffect(() => {
    if (!open || !partId) {
      setImageUrl(null)
      setError('')
      return
    }
    let cancelled = false
    void getPartById(partId)
      .then(part => {
        if (!cancelled) setImageUrl(partImageUrl(part?.image_path))
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'))
      })
    return () => {
      cancelled = true
    }
  }, [open, partId, t])

  async function onFile(file: File | undefined) {
    if (!file || !partId) return
    setUploading(true)
    setError('')
    try {
      const path = await uploadPartImage(partId, file)
      setImageUrl(partImageUrl(path))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('bom.partInfoAction')}
      subtitle={partSubtitle(row)}
      icon={<Info className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          {imageUrl ? (
            <img src={imageUrl} alt={t('bom.partImage')} className="mx-auto max-h-56 w-full object-contain" />
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-slate-500">
              <ImagePlus className="h-8 w-8" />
              <p className="text-xs font-bold">{t('bom.partImageEmpty')}</p>
            </div>
          )}
        </div>
        {canUpdate && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => void onFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
            >
              {uploading ? t('common.loading') : t('bom.partImageUpload')}
            </button>
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-300">{error}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase text-slate-500">
                <th className="px-3 py-2 text-start">{t('bom.iplPartCardModel')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
                <th className="px-3 py-2 text-center">{t('bom.station')}</th>
                <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.part_kind')}</th>
                <th className="px-3 py-2 text-center">{t('bom.col.supply_source')}</th>
                <th className="px-3 py-2 text-center">{t('bom.stopperType')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ model, item }) => {
                const status = iplFitStatusForModel(item, model)
                return (
                  <tr key={model} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 font-black text-slate-100">{model}</td>
                    {status !== 'fitted' ? (
                      <td className="px-3 py-2 text-center" colSpan={6}>
                        <IplFitStatusChip value={status === 'not_fitted' ? IPL_COMPARE_NOT_FITTED : IPL_COMPARE_UNSET} />
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-center font-mono text-cyan-200" dir="ltr">
                          {iplDisplayPartNumber(item.part_number) || '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-200">
                          {displayBomStationCode(item.station_code_text) || item.station_code_text || '—'}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-white">{modelQtyForBomRow(item, model) || '—'}</td>
                        <td className="px-3 py-2 text-center text-slate-200">
                          {item.part_type ? labelForPartKindValue(item.part_type, k => t(k)) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-200">
                          {item.supply_source ? labelForSupplySourceValue(item.supply_source, k => t(k)) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-200">{stopperLabel(item, t) || '—'}</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

export function IplAllModelsFeedingModal({ open, row, models, onClose }: Props) {
  const { t } = useLang()
  const lines = presentModels(row, models)

  return (
    <Modal
      open={open}
      title={t('bom.partFeedingAction')}
      subtitle={partSubtitle(row)}
      icon={<Boxes className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-6xl"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase text-slate-500">
              <th className="px-3 py-2 text-start">{t('bom.iplPartCardModel')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.feeding_method')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.packing')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.part_direction')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.carton_qty')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.part_length')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.part_weight')}</th>
              <th className="px-3 py-2 text-center">{t('bom.iplLogistics.rack_code')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ model, item }) => {
              const status = iplFitStatusForModel(item, model)
              const feeding = iplFeedingCardFromBomItem(item)
              const dims = [feeding.part_length, feeding.part_width, feeding.part_height].filter(Boolean).join(' × ')
              return (
                <tr key={model} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-3 py-2 font-black text-slate-100">{model}</td>
                  {status !== 'fitted' ? (
                    <td className="px-3 py-2 text-center" colSpan={7}>
                      <IplFitStatusChip value={status === 'not_fitted' ? IPL_COMPARE_NOT_FITTED : IPL_COMPARE_UNSET} />
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center text-slate-200">{feeding.feeding_method || '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{packingLabel(feeding.packing, t) || '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{directionLabel(feeding.part_direction, t) || '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-200">{feeding.carton_qty || '—'}</td>
                      <td className="px-3 py-2 text-center text-slate-200" dir="ltr">
                        {dims || '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-200">{feeding.part_weight || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-cyan-200" dir="ltr">
                        {feeding.rack_code || '—'}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
