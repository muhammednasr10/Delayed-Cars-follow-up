import { useCallback, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useLang } from '../../../i18n/LanguageContext'
import { Modal } from '../../Modal'
import { ConfirmDialog } from '../../ConfirmDialog'
import { inputCls } from '../../FormField'
import {
  createWarehouseCart,
  deleteWarehouseCart,
  getWarehouseCarts,
  updateWarehouseCart
} from '../../../services/warehouseEquipmentService'
import type { Warehouse, WarehouseCart, WarehouseEquipmentStatus } from '../../../Types/warehouse'
import { equipmentTd, equipmentTh } from './equipmentUi'
import { useEquipmentListState } from './useEquipmentListState'
import { WarehouseEquipmentSectionHeader } from './WarehouseEquipmentSectionHeader'
import { WarehouseEquipmentListCard } from './WarehouseEquipmentListCard'
import { WarehouseEquipmentRowActions } from './WarehouseEquipmentRowActions'
import {
  WarehouseEquipmentCommonFields,
  WarehouseEquipmentModalFooter
} from './WarehouseEquipmentFormFields'

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
  status: WarehouseEquipmentStatus
  notes: string
}

const emptyForm = (): FormState => ({
  warehouseId: '',
  code: '',
  name: '',
  cartType: '',
  capacity: '',
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

export function WarehouseCartsTab({ warehouses, canManage, notify }: Props) {
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
        title={t('warehouses.equipment.subTabs.carts')}
        hint={t('warehouses.equipment.cartsHint')}
        canManage={canManage}
        onRefresh={() => void load()}
        onAdd={openCreate}
        search={search}
        onSearch={setSearch}
        refreshLabel={t('common.refresh')}
        addLabel={t('common.add')}
        searchPlaceholder={t('common.search')}
      />

      <WarehouseEquipmentListCard loading={loading} isEmpty={filtered.length === 0} emptyTitle={t('warehouses.equipment.cartsEmpty')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className={equipmentTh}>{t('warehouses.equipment.cols.code')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.name')}</th>
                <th className={equipmentTh}>{t('warehouses.stock.warehouse')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.cartType')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.capacity')}</th>
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
                  <td className={equipmentTd}>{row.warehouseCode ? `${row.warehouseCode} — ${row.warehouseName}` : '—'}</td>
                  <td className={equipmentTd}>{row.cartType || '—'}</td>
                  <td className={equipmentTd}>{row.capacity || '—'}</td>
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
        title={editId ? t('warehouses.equipment.editCart') : t('warehouses.equipment.addCart')}
        icon={<ShoppingCart className="h-5 w-5" />}
        onClose={() => setFormOpen(false)}
        maxWidthClass="max-w-xl"
        footer={<WarehouseEquipmentModalFooter busy={busy} onCancel={() => setFormOpen(false)} onSave={() => void submit()} />}
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
