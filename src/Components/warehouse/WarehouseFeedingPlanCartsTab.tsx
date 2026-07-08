import { useCallback, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { ConfirmDialog } from '../ConfirmDialog'
import { inputCls } from '../FormField'
import {
  createWarehouseCart,
  deleteWarehouseCart,
  getWarehouseCarts,
  updateWarehouseCart
} from '../../services/warehouseEquipmentService'
import type { Warehouse, WarehouseCart, WarehouseEquipmentStatus } from '../../Types/warehouse'
import {
  DEFAULT_CART_DOLL_COUNT,
  DEFAULT_CART_MAX_LOAD_KG,
  DEFAULT_DOLL_HEIGHT_CM,
  DEFAULT_DOLL_LENGTH_CM,
  DEFAULT_DOLL_WIDTH_CM
} from '../../Utils/feedingTripPlanner'
import { equipmentTd, equipmentTh } from './equipment/equipmentUi'
import { useEquipmentListState } from './equipment/useEquipmentListState'
import { WarehouseEquipmentSectionHeader } from './equipment/WarehouseEquipmentSectionHeader'
import { WarehouseEquipmentListCard } from './equipment/WarehouseEquipmentListCard'
import { WarehouseEquipmentRowActions } from './equipment/WarehouseEquipmentRowActions'
import {
  WarehouseEquipmentCommonFields,
  WarehouseEquipmentModalFooter
} from './equipment/WarehouseEquipmentFormFields'

type Props = {
  warehouses: Warehouse[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

type FormState = {
  warehouseId: string
  code: string
  name: string
  cartType: string
  capacity: string
  maxLoadKg: string
  dollCount: string
  dollLengthCm: string
  dollWidthCm: string
  dollHeightCm: string
  status: WarehouseEquipmentStatus
  notes: string
}

const emptyForm = (): FormState => ({
  warehouseId: '',
  code: '',
  name: '',
  cartType: '',
  capacity: '',
  maxLoadKg: String(DEFAULT_CART_MAX_LOAD_KG),
  dollCount: String(DEFAULT_CART_DOLL_COUNT),
  dollLengthCm: String(DEFAULT_DOLL_LENGTH_CM),
  dollWidthCm: String(DEFAULT_DOLL_WIDTH_CM),
  dollHeightCm: String(DEFAULT_DOLL_HEIGHT_CM),
  status: 'active',
  notes: ''
})

function filterCart(row: WarehouseCart, q: string) {
  return (
    row.code.toLowerCase().includes(q) ||
    (row.name ?? '').toLowerCase().includes(q) ||
    (row.cartType ?? '').toLowerCase().includes(q)
  )
}

function parseNum(s: string): number | null {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

function fmtDims(row: WarehouseCart): string {
  const l = row.dollLengthCm ?? DEFAULT_DOLL_LENGTH_CM
  const w = row.dollWidthCm ?? DEFAULT_DOLL_WIDTH_CM
  const h = row.dollHeightCm ?? DEFAULT_DOLL_HEIGHT_CM
  return `${l}×${w}×${h}`
}

export function WarehouseFeedingPlanCartsTab({ warehouses, canManage, notify }: Props) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const loadRows = useCallback(() => getWarehouseCarts(), [])
  const { loading, search, setSearch, filtered, busy, setBusy, deleteId, setDeleteId, load, runDelete } =
    useEquipmentListState({ loadRows, filterRow: filterCart, notify })

  function patchForm(patch: Partial<FormState>) {
    setForm(f => ({ ...f, ...patch }))
  }

  function openCreate() {
    setEditId(null)
    setForm({ ...emptyForm(), warehouseId: warehouses[0]?.id ?? '' })
    setFormOpen(true)
  }

  function openEdit(row: WarehouseCart) {
    setEditId(row.id)
    setForm({
      warehouseId: row.warehouseId ?? '',
      code: row.code,
      name: row.name ?? '',
      cartType: row.cartType ?? '',
      capacity: row.capacity ?? '',
      maxLoadKg: row.maxLoadKg != null ? String(row.maxLoadKg) : String(DEFAULT_CART_MAX_LOAD_KG),
      dollCount: row.dollCount != null ? String(row.dollCount) : String(DEFAULT_CART_DOLL_COUNT),
      dollLengthCm: row.dollLengthCm != null ? String(row.dollLengthCm) : String(DEFAULT_DOLL_LENGTH_CM),
      dollWidthCm: row.dollWidthCm != null ? String(row.dollWidthCm) : String(DEFAULT_DOLL_WIDTH_CM),
      dollHeightCm: row.dollHeightCm != null ? String(row.dollHeightCm) : String(DEFAULT_DOLL_HEIGHT_CM),
      status: row.status,
      notes: row.notes ?? ''
    })
    setFormOpen(true)
  }

  async function submit() {
    if (!form.code.trim()) {
      notify(t('warehouses.equipment.codeRequired'), true)
      return
    }
    setBusy(true)
    try {
      const payload = {
        warehouseId: form.warehouseId || null,
        code: form.code,
        name: form.name || null,
        cartType: form.cartType || null,
        capacity: form.capacity || null,
        maxLoadKg: parseNum(form.maxLoadKg),
        dollCount: parseNum(form.dollCount) != null ? Math.floor(parseNum(form.dollCount)!) : null,
        dollLengthCm: parseNum(form.dollLengthCm),
        dollWidthCm: parseNum(form.dollWidthCm),
        dollHeightCm: parseNum(form.dollHeightCm),
        status: form.status,
        notes: form.notes || null
      }
      if (editId) await updateWarehouseCart(editId, payload)
      else await createWarehouseCart(payload)
      notify(t(editId ? 'settings.updated' : 'settings.added'))
      setFormOpen(false)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : t('common.error'), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <WarehouseEquipmentSectionHeader
        icon={ShoppingCart}
        toneClass="bg-amber-500/15 text-amber-300"
        title={t('warehouses.feeding.planSubTabs.carts')}
        hint={t('warehouses.feeding.cartsHint')}
        canManage={canManage}
        onRefresh={() => void load()}
        onAdd={openCreate}
        search={search}
        onSearch={setSearch}
        refreshLabel={t('common.refresh')}
        addLabel={t('common.add')}
        searchPlaceholder={t('common.search')}
      />

      <WarehouseEquipmentListCard
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyTitle={t('warehouses.feeding.cartsEmpty')}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className={equipmentTh}>{t('warehouses.feeding.carts.cols.id')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.name')}</th>
                <th className={equipmentTh}>{t('warehouses.feeding.carts.cols.maxLoad')}</th>
                <th className={equipmentTh}>{t('warehouses.feeding.carts.cols.dollCount')}</th>
                <th className={equipmentTh}>{t('warehouses.feeding.carts.cols.dollDims')}</th>
                <th className={equipmentTh}>{t('warehouses.stock.warehouse')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.status')}</th>
                {canManage && <th className={equipmentTh}>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                  <td className={`${equipmentTd} font-mono text-cyan-200`} dir="ltr">
                    {row.code}
                  </td>
                  <td className={equipmentTd}>{row.name || '—'}</td>
                  <td className={equipmentTd} dir="ltr">
                    {row.maxLoadKg ?? DEFAULT_CART_MAX_LOAD_KG} {t('bom.iplLogistics.unitKg')}
                  </td>
                  <td className={equipmentTd} dir="ltr">
                    {row.dollCount ?? DEFAULT_CART_DOLL_COUNT}
                  </td>
                  <td className={`${equipmentTd} font-mono text-slate-400`} dir="ltr">
                    {fmtDims(row)} {t('bom.iplLogistics.unitCm')}
                  </td>
                  <td className={equipmentTd}>
                    {row.warehouseCode ? `${row.warehouseCode} — ${row.warehouseName}` : '—'}
                  </td>
                  <td className={equipmentTd}>{t(`warehouses.equipment.status.${row.status}`)}</td>
                  {canManage && (
                    <td className={equipmentTd}>
                      <WarehouseEquipmentRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteId(row.id)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WarehouseEquipmentListCard>

      <Modal
        open={formOpen}
        title={editId ? t('warehouses.feeding.carts.edit') : t('warehouses.feeding.carts.add')}
        icon={<ShoppingCart className="h-5 w-5" />}
        onClose={() => setFormOpen(false)}
        maxWidthClass="max-w-2xl"
        footer={
          <WarehouseEquipmentModalFooter busy={busy} onCancel={() => setFormOpen(false)} onSave={() => void submit()} />
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WarehouseEquipmentCommonFields
            code={form.code}
            name={form.name}
            warehouseId={form.warehouseId}
            capacity={form.capacity}
            status={form.status}
            notes={form.notes}
            warehouses={warehouses}
            onChange={patch => patchForm(patch)}
          />
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.cartType')}</span>
            <input className={inputCls()} value={form.cartType} onChange={e => patchForm({ cartType: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.carts.cols.maxLoad')}</span>
            <input
              className={inputCls()}
              value={form.maxLoadKg}
              onChange={e => patchForm({ maxLoadKg: e.target.value })}
              dir="ltr"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.carts.cols.dollCount')}</span>
            <input
              className={inputCls()}
              value={form.dollCount}
              onChange={e => patchForm({ dollCount: e.target.value })}
              dir="ltr"
              inputMode="numeric"
            />
          </label>
        </div>
        <p className="mb-2 mt-4 text-[10px] font-bold text-slate-500">{t('warehouses.feeding.carts.dollDimsTitle')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              {t('bom.iplLogistics.part_length')} ({t('bom.iplLogistics.unitCm')})
            </span>
            <input
              className={inputCls()}
              value={form.dollLengthCm}
              onChange={e => patchForm({ dollLengthCm: e.target.value })}
              dir="ltr"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              {t('bom.iplLogistics.part_width')} ({t('bom.iplLogistics.unitCm')})
            </span>
            <input
              className={inputCls()}
              value={form.dollWidthCm}
              onChange={e => patchForm({ dollWidthCm: e.target.value })}
              dir="ltr"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              {t('bom.iplLogistics.part_height')} ({t('bom.iplLogistics.unitCm')})
            </span>
            <input
              className={inputCls()}
              value={form.dollHeightCm}
              onChange={e => patchForm({ dollHeightCm: e.target.value })}
              dir="ltr"
              inputMode="decimal"
            />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t('settings.deleteTitle')}
        message={t('warehouses.equipment.deleteConfirm')}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void runDelete(deleteWarehouseCart)}
        busy={busy}
      />
    </div>
  )
}
