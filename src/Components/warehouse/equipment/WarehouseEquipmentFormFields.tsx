import { useLang } from '../../../i18n/LanguageContext'
import { inputCls } from '../../FormField'
import type { Warehouse, WarehouseEquipmentStatus } from '../../../Types/warehouse'
import { EQUIPMENT_STATUSES } from './equipmentUi'

type CommonFieldsProps = {
  code: string
  name: string
  warehouseId: string
  capacity: string
  status: WarehouseEquipmentStatus
  notes: string
  warehouses: Warehouse[]
  onChange: (patch: Partial<CommonFieldsProps>) => void
}

export function WarehouseEquipmentCommonFields({
  code,
  name,
  warehouseId,
  capacity,
  status,
  notes,
  warehouses,
  onChange
}: CommonFieldsProps) {
  const { t } = useLang()

  return (
    <>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.code')} *</span>
        <input className={inputCls()} value={code} onChange={e => onChange({ code: e.target.value })} dir="ltr" />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.name')}</span>
        <input className={inputCls()} value={name} onChange={e => onChange({ name: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('warehouses.stock.warehouse')}</span>
        <select className={inputCls()} value={warehouseId} onChange={e => onChange({ warehouseId: e.target.value })}>
          <option value="">{t('warehouses.equipment.optional')}</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.capacity')}</span>
        <input className={inputCls()} value={capacity} onChange={e => onChange({ capacity: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.status')}</span>
        <select className={inputCls()} value={status} onChange={e => onChange({ status: e.target.value as WarehouseEquipmentStatus })}>
          {EQUIPMENT_STATUSES.map(s => (
            <option key={s} value={s}>
              {t(`warehouses.equipment.status.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-xs text-slate-500">{t('common.notes')}</span>
        <textarea className={inputCls()} rows={2} value={notes} onChange={e => onChange({ notes: e.target.value })} />
      </label>
    </>
  )
}

export function WarehouseEquipmentModalFooter({
  busy,
  onCancel,
  onSave
}: {
  busy: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useLang()
  return (
    <>
      <button type="button" onClick={onCancel} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300">
        {t('common.cancel')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
      >
        {t('common.save')}
      </button>
    </>
  )
}
