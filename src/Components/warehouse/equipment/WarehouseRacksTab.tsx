import { useCallback, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useLang } from '../../../i18n/LanguageContext'
import { Modal } from '../../Modal'
import { ConfirmDialog } from '../../ConfirmDialog'
import { inputCls } from '../../FormField'
import {
  createWarehouseRack,
  deleteWarehouseRack,
  getWarehouseRacks,
  updateWarehouseRack
} from '../../../services/warehouseEquipmentService'
import type { Warehouse, WarehouseEquipmentStatus, WarehouseRack } from '../../../Types/warehouse'
import type { Station } from '../../../Types/settings'
import { equipmentTd, equipmentTh, parseOptionalNumber } from './equipmentUi'
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
  stations: Station[]
  canManage: boolean
  notify: (msg: string, isError?: boolean) => void
}

type FormState = {
  warehouseId: string
  stationId: string
  code: string
  name: string
  capacity: string
  lengthMm: string
  widthMm: string
  heightMm: string
  direction: string
  status: WarehouseEquipmentStatus
  notes: string
}

const emptyForm = (): FormState => ({
  warehouseId: '',
  stationId: '',
  code: '',
  name: '',
  capacity: '',
  lengthMm: '',
  widthMm: '',
  heightMm: '',
  direction: '',
  status: 'active',
  notes: ''
})

function filterRack(row: WarehouseRack, q: string) {
  return (
    row.code.toLowerCase().includes(q) ||
    (row.name ?? '').toLowerCase().includes(q) ||
    (row.stationNumber ?? '').toLowerCase().includes(q)
  )
}

export function WarehouseRacksTab({ warehouses, stations, canManage, notify }: Props) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const loadRows = useCallback(() => getWarehouseRacks(), [])
  const { loading, search, setSearch, filtered, busy, setBusy, deleteId, setDeleteId, load, runDelete } =
    useEquipmentListState({ loadRows, filterRow: filterRack, notify })

  function patchForm(patch: Partial<FormState>) {
    setForm(f => ({ ...f, ...patch }))
  }

  function openCreate() {
    setEditId(null)
    setForm({ ...emptyForm(), warehouseId: warehouses[0]?.id ?? '' })
    setFormOpen(true)
  }

  function openEdit(row: WarehouseRack) {
    setEditId(row.id)
    setForm({
      warehouseId: row.warehouseId ?? '',
      stationId: row.stationId ?? '',
      code: row.code,
      name: row.name ?? '',
      capacity: row.capacity ?? '',
      lengthMm: row.lengthMm != null ? String(row.lengthMm) : '',
      widthMm: row.widthMm != null ? String(row.widthMm) : '',
      heightMm: row.heightMm != null ? String(row.heightMm) : '',
      direction: row.direction ?? '',
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
        stationId: form.stationId || null,
        code: form.code,
        name: form.name || null,
        capacity: form.capacity || null,
        lengthMm: parseOptionalNumber(form.lengthMm),
        widthMm: parseOptionalNumber(form.widthMm),
        heightMm: parseOptionalNumber(form.heightMm),
        direction: form.direction || null,
        status: form.status,
        notes: form.notes || null
      }
      if (editId) await updateWarehouseRack(editId, payload)
      else await createWarehouseRack(payload)
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
        icon={LayoutGrid}
        toneClass="bg-emerald-500/15 text-emerald-300"
        title={t('warehouses.equipment.subTabs.racks')}
        hint={t('warehouses.equipment.racksHint')}
        canManage={canManage}
        onRefresh={() => void load()}
        onAdd={openCreate}
        search={search}
        onSearch={setSearch}
        refreshLabel={t('common.refresh')}
        addLabel={t('common.add')}
        searchPlaceholder={t('common.search')}
      />

      <WarehouseEquipmentListCard loading={loading} isEmpty={filtered.length === 0} emptyTitle={t('warehouses.equipment.racksEmpty')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className={equipmentTh}>{t('warehouses.equipment.cols.code')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.name')}</th>
                <th className={equipmentTh}>{t('warehouses.stock.warehouse')}</th>
                <th className={equipmentTh}>{t('warehouses.feeding.station')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.capacity')}</th>
                <th className={equipmentTh}>{t('warehouses.equipment.cols.dimensions')}</th>
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
                  <td className={equipmentTd} dir="ltr">
                    {row.stationNumber ? `${row.stationNumber}${row.stationName ? ` — ${row.stationName}` : ''}` : '—'}
                  </td>
                  <td className={equipmentTd}>{row.capacity || '—'}</td>
                  <td className={equipmentTd} dir="ltr">
                    {row.lengthMm || row.widthMm || row.heightMm
                      ? `${row.lengthMm ?? '—'}×${row.widthMm ?? '—'}×${row.heightMm ?? '—'}`
                      : '—'}
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
        title={editId ? t('warehouses.equipment.editRack') : t('warehouses.equipment.addRack')}
        icon={<LayoutGrid className="h-5 w-5" />}
        onClose={() => setFormOpen(false)}
        maxWidthClass="max-w-2xl"
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
            <span className="mb-1 block text-xs text-slate-500">{t('warehouses.feeding.station')}</span>
            <select className={inputCls()} value={form.stationId} onChange={e => patchForm({ stationId: e.target.value })}>
              <option value="">{t('warehouses.equipment.optional')}</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.station_number} — {s.station_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">{t('warehouses.equipment.cols.direction')}</span>
            <input className={inputCls()} value={form.direction} onChange={e => patchForm({ direction: e.target.value })} placeholder="ي / ش" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">L (mm)</span>
            <input type="number" className={inputCls()} value={form.lengthMm} onChange={e => patchForm({ lengthMm: e.target.value })} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">W (mm)</span>
            <input type="number" className={inputCls()} value={form.widthMm} onChange={e => patchForm({ widthMm: e.target.value })} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">H (mm)</span>
            <input type="number" className={inputCls()} value={form.heightMm} onChange={e => patchForm({ heightMm: e.target.value })} dir="ltr" />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t('settings.deleteTitle')}
        message={t('warehouses.equipment.deleteConfirm')}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void runDelete(deleteWarehouseRack)}
        busy={busy}
      />
    </div>
  )
}
