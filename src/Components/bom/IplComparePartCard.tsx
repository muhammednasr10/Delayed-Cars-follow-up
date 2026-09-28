import { Boxes, ImagePlus, Info, Package, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import {
  IPL_COMPARE_NOT_FITTED,
  IPL_COMPARE_UNSET,
  iplFitStatusForModel,
  type IplCompareRow
} from '../../Utils/iplModelCompare'
import { iplDisplayPartNumber, isPendingBomItemId } from '../../Utils/iplModelParts'
import { displayBomStationCode } from '../../Utils/bomStationCode'
import { modelQtyForBomRow } from '../../Utils/bomQtyByModel'
import { iplFeedingCardFromBomItem, type BomIplFeedingCard } from '../../Utils/iplBomLogistics'
import { labelForPartKindValue, labelForSupplySourceValue } from '../../Utils/bomPresetOptions'
import type { BomItemDetail } from '../../Types/bom'
import { getPartById, partImageUrl, uploadPartImage } from '../../services/partsService'
import { updateBomIplFeedingCard } from '../../services/bomIplService'
import { BomIplLogisticsPanel } from './BomIplLogisticsPanel'
import { IplFitStatusChip } from './IplFitStatusChip'

type Props = {
  open: boolean
  row: IplCompareRow
  models: string[]
  canUpdate?: boolean
  onEdit?: (partId: string) => void
  onRefresh?: () => void
  onClose: () => void
}

type RowAction = { model: string; item: BomItemDetail }

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

function stopperLabel(item: BomItemDetail, t: (k: string) => string): string {
  const feeding = iplFeedingCardFromBomItem(item)
  if (feeding.stopper_type === 'line_stopper') return t('bom.stopperLine')
  if (feeding.stopper_type === 'car_stopper') return t('bom.stopperCar')
  if (feeding.stopper_type) return t('bom.stopperNone')
  return ''
}

function IplPartInfoModal({
  target,
  partLabel,
  canUpdate,
  onClose
}: {
  target: RowAction | null
  partLabel: string
  canUpdate?: boolean
  onClose: () => void
}) {
  const { t } = useLang()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) {
      setImageUrl(null)
      setError('')
      return
    }
    let cancelled = false
    setError('')
    void getPartById(target.item.part_id)
      .then(part => {
        if (!cancelled) setImageUrl(partImageUrl(part?.image_path))
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'))
      })
    return () => {
      cancelled = true
    }
  }, [target, t])

  async function onFile(file: File | undefined) {
    if (!file || !target) return
    setUploading(true)
    setError('')
    try {
      const path = await uploadPartImage(target.item.part_id, file)
      setImageUrl(partImageUrl(path))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  const item = target?.item
  const status = target && item ? iplFitStatusForModel(item, target.model) : 'unset'

  return (
    <Modal
      open={Boolean(target)}
      title={t('bom.partInfoAction')}
      subtitle={target ? `${partLabel} · ${target.model}` : undefined}
      icon={<Info className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      zIndexClass="z-[140]"
    >
      {target && item && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {imageUrl ? (
              <img src={imageUrl} alt={t('bom.partImage')} className="mx-auto max-h-64 w-full object-contain" />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CardField
              label={t('bom.col.part_number')}
              value={status === 'fitted' ? iplDisplayPartNumber(item.part_number) : ''}
              mono
            />
            <CardField
              label={t('bom.station')}
              value={status === 'fitted' ? displayBomStationCode(item.station_code_text) || item.station_code_text || '' : ''}
            />
            <CardField
              label={t('bom.col.part_kind')}
              value={item.part_type ? labelForPartKindValue(item.part_type, k => t(k)) : ''}
            />
            <CardField
              label={t('bom.col.supply_source')}
              value={item.supply_source ? labelForSupplySourceValue(item.supply_source, k => t(k)) : ''}
            />
            <CardField label={t('bom.stopperType')} value={stopperLabel(item, t)} />
            <CardField label={t('bom.categoryName')} value={item.category_name_ar ?? ''} />
            <CardField label={t('common.notes')} value={item.notes ?? ''} />
          </div>
        </div>
      )}
    </Modal>
  )
}

function IplPartFeedingModal({
  target,
  canUpdate,
  onClose,
  onSaved
}: {
  target: RowAction | null
  canUpdate?: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const { t } = useLang()
  const [draft, setDraft] = useState<BomIplFeedingCard | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) {
      setDraft(null)
      setError('')
      return
    }
    setDraft(iplFeedingCardFromBomItem(target.item))
    setError('')
  }, [target])

  async function save() {
    if (!target || !draft || isPendingBomItemId(target.item.id)) return
    setSaving(true)
    setError('')
    try {
      await updateBomIplFeedingCard([target.item.id], draft)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={Boolean(target && draft)}
      title={t('bom.partFeedingAction')}
      subtitle={target?.model}
      icon={<Boxes className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      zIndexClass="z-[140]"
      footer={
        canUpdate ? (
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
              onClick={() => void save()}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        ) : undefined
      }
    >
      {draft && (
        <div>
          {error && <p className="mb-2 text-xs font-bold text-rose-300">{error}</p>}
          <BomIplLogisticsPanel canUpdate={Boolean(canUpdate)} hideSave value={draft} onChange={setDraft} />
        </div>
      )}
    </Modal>
  )
}

export function IplComparePartCard({ open, row, models, canUpdate, onEdit, onRefresh, onClose }: Props) {
  const { t } = useLang()
  const [info, setInfo] = useState<RowAction | null>(null)
  const [feeding, setFeeding] = useState<RowAction | null>(null)
  const present = models
    .map(model => ({ model, item: row.byModel.get(model) }))
    .filter((x): x is { model: string; item: BomItemDetail } => Boolean(x.item))
  const fittedItems = present.filter(p => iplFitStatusForModel(p.item, p.model) === 'fitted').map(p => p.item)
  const sample = pickRichestBomItem(fittedItems)

  return (
    <>
      <Modal
        open={open}
        title={t('bom.partDetails')}
        subtitle={`${row.partNameAr}${row.partNameEn && row.partNameEn !== '—' ? ` · ${row.partNameEn}` : ''}`}
        icon={<Package className="h-5 w-5" />}
        onClose={onClose}
        maxWidthClass="max-w-4xl"
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
          {sample && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CardField
                label={t('bom.col.part_kind')}
                value={sample.part_type ? labelForPartKindValue(sample.part_type, k => t(k)) : ''}
              />
              <CardField
                label={t('bom.col.supply_source')}
                value={sample.supply_source ? labelForSupplySourceValue(sample.supply_source, k => t(k)) : ''}
              />
              <CardField label={t('bom.stopperType')} value={stopperLabel(sample, t)} />
              <CardField label={t('bom.categoryName')} value={sample.category_name_ar ?? ''} />
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase text-cyan-300">{t('bom.iplPartCardModels')}</p>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase text-slate-500">
                    <th className="px-3 py-2 text-start">{t('bom.iplPartCardModel')}</th>
                    <th className="px-3 py-2 text-center">{t('bom.col.part_number')}</th>
                    <th className="px-3 py-2 text-center">{t('bom.station')}</th>
                    <th className="px-3 py-2 text-center">{t('bom.qtyPerCar')}</th>
                    <th className="px-3 py-2 text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {present.map(({ model, item }) => {
                    const status = iplFitStatusForModel(item, model)
                    return (
                      <tr key={model} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-3 py-2 font-black text-slate-200">{model}</td>
                        {status !== 'fitted' ? (
                          <td className="px-3 py-2 text-center" colSpan={3}>
                            <IplFitStatusChip
                              value={status === 'not_fitted' ? IPL_COMPARE_NOT_FITTED : IPL_COMPARE_UNSET}
                            />
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center font-mono text-cyan-200" dir="ltr">
                              {iplDisplayPartNumber(item.part_number) || '—'}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-200">
                              {displayBomStationCode(item.station_code_text) || item.station_code_text || '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-black text-white">
                              {modelQtyForBomRow(item, model) || '—'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                              title={t('bom.partInfoAction')}
                              onClick={() => setInfo({ model, item })}
                            >
                              <Info className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                              title={t('bom.partFeedingAction')}
                              onClick={() => setFeeding({ model, item })}
                            >
                              <Boxes className="h-4 w-4" />
                            </button>
                          </div>
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
      <IplPartInfoModal
        target={open ? info : null}
        partLabel={row.partNameAr}
        canUpdate={canUpdate}
        onClose={() => setInfo(null)}
      />
      <IplPartFeedingModal
        target={open ? feeding : null}
        canUpdate={canUpdate}
        onClose={() => setFeeding(null)}
        onSaved={onRefresh}
      />
    </>
  )
}
