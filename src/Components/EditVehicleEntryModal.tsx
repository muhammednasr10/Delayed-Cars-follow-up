import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { useVehicles } from '../Context/VehiclesContext'
import { Modal } from './Modal'
import { Field, inputCls } from './FormField'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { getProductionOrders } from '../services/productionOrdersService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import type { ProductionOrder } from '../Types/production'
import type { VehicleColor, VehicleModel } from '../Types/settings'
import type { VehicleOverview } from '../Types/vehicle'

type Props = {
  vehicle: VehicleOverview | null
  onClose: () => void
}

export function EditVehicleEntryModal({ vehicle, onClose }: Props) {
  const { t } = useLang()
  const { updateVehicle } = useVehicles()

  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [colorId, setColorId] = useState('')
  const [productionOrderId, setProductionOrderId] = useState('')
  const [vin, setVin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!vehicle) return
    setVin(vehicle.vin)
    setModelId(vehicle.modelId ?? '')
    setColorId(vehicle.vehicleColorId ?? '')
    setProductionOrderId(vehicle.productionOrderId ?? '')
    setError('')
  }, [vehicle])

  useEffect(() => {
    if (!vehicle) return
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors(), getProductionOrders()])
      .then(([m, c, o]) => {
        setModels(m)
        setColors(c)
        setOrders(o)
        const mid = vehicle.modelId ?? ''
        if (mid) {
          const fam = resolveFamilyIdForVariant(m, mid)
          if (fam) setFamilyId(fam)
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [vehicle, t])

  async function submit() {
    if (!vehicle) return
    setError('')
    if (vin.trim().length < 6) {
      setError(t('productivity.entryVinRequired'))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }

    setSubmitting(true)
    const result = await updateVehicle(vehicle.id, {
      vin: vin.trim(),
      modelId,
      vehicleColorId: colorId || null,
      productionOrderId: productionOrderId || null
    })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message || t('common.error'))
      return
    }
    onClose()
  }

  return (
    <Modal
      open={!!vehicle}
      title={t('vehicles.editEntryTitle')}
      subtitle={vehicle?.vin}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-slate-200">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={submitting || listsLoading}
            onClick={() => void submit()}
            className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 disabled:opacity-50"
          >
            {submitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label={t('vehicles.cols.vin')} required>
          <input className={inputCls()} dir="ltr" value={vin} onChange={e => setVin(e.target.value)} />
        </Field>

        <VehicleModelFamilyPicker
          models={models}
          familyId={familyId}
          variantId={modelId}
          loading={listsLoading}
          onFamilyChange={setFamilyId}
          onVariantChange={id => {
            setModelId(id)
            const fam = resolveFamilyIdForVariant(models, id)
            if (fam) setFamilyId(fam)
          }}
        />

        <Field label={t('mp.f.color')}>
          {listsLoading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : (
            <select className={inputCls()} value={colorId} onChange={e => setColorId(e.target.value)}>
              <option value="">—</option>
              {colors.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label={t('vehicles.cols.po')}>
          <select
            className={inputCls()}
            value={productionOrderId}
            onChange={e => setProductionOrderId(e.target.value)}
            disabled={listsLoading}
          >
            <option value="">—</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.orderNumber}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
      </div>
    </Modal>
  )
}
