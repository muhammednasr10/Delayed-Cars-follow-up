import { useEffect, useState } from 'react'
import { Car, ChevronUp, PlusCircle } from 'lucide-react'
import { useVehicles } from '../Context/VehiclesContext'
import { useLang } from '../i18n/LanguageContext'
import { useEmployees } from '../hooks/useEmployees'
import { useFactoryOrgScope } from '../hooks/useFactoryOrgScope'
import { Field, inputCls } from './FormField'
import { FactoryOrgUnitPicker } from './FactoryOrgUnitPicker'
import { VehicleModelFamilyPicker, resolveFamilyIdForVariant } from './VehicleModelFamilyPicker'
import { getFactoryOrgUnits } from '../services/factoryOrgService'
import { getVehicleColors, getVehicleModels } from '../services/settingsService'
import { orgPathLeaf } from '../Utils/employeeOrgPicker'
import type { FactoryOrgUnit } from '../Types/factoryOrg'
import type { VehicleColor, VehicleModel } from '../Types/settings'

type Props = {
  onSaved?: () => void
}

export function NewVehicleEntryForm({ onSaved }: Props) {
  const { addVehicle } = useVehicles()
  const { t } = useLang()
  const { employees } = useEmployees()
  const { defaultOrgPath } = useFactoryOrgScope(employees)
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<VehicleModel[]>([])
  const [colors, setColors] = useState<VehicleColor[]>([])
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [familyId, setFamilyId] = useState('')
  const [modelId, setModelId] = useState('')
  const [colorId, setColorId] = useState('')
  const [orgPath, setOrgPath] = useState<string[]>([])
  const [vin, setVin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setListsLoading(true)
    Promise.all([getVehicleModels(), getVehicleColors(), getFactoryOrgUnits({ includeInactive: true })])
      .then(([m, c, units]) => {
        setModels(m)
        setColors(c)
        setOrgUnits(units)
        setOrgPath(prev => (prev.length ? prev : [...defaultOrgPath]))
      })
      .catch(err => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setListsLoading(false))
  }, [open, t, defaultOrgPath])

  function resetForm() {
    setVin('')
    setFamilyId('')
    setModelId('')
    setColorId('')
    setOrgPath([...defaultOrgPath])
    setError('')
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  async function submit() {
    setError('')
    if (vin.trim().length < 6) {
      setError(t('productivity.entryVinRequired'))
      return
    }
    if (!modelId) {
      setError(t('mp.f.model'))
      return
    }
    if (!orgPathLeaf(orgPath)) {
      setError(t('org.f.orgUnit'))
      return
    }

    setSubmitting(true)
    const result = await addVehicle({
      vin: vin.trim(),
      modelId,
      productionOrderId: null,
      vehicleColorId: colorId || null,
      factoryOrgUnitId: orgPathLeaf(orgPath)
    })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.message || t('common.error'))
      return
    }

    resetForm()
    setOpen(false)
    onSaved?.()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cyan-500/50 bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-slate-900/40 px-6 py-8 text-center shadow-lg shadow-cyan-500/10 transition hover:border-cyan-400 hover:from-cyan-500/30 hover:to-slate-900/60"
      >
        <div className="rounded-2xl bg-cyan-500 p-3 text-slate-950">
          <PlusCircle className="h-8 w-8" />
        </div>
        <div className="text-start">
          <p className="text-lg font-black text-white sm:text-xl">{t('productivity.addVehicleCta')}</p>
          <p className="mt-1 text-sm text-cyan-100/80">{t('productivity.addVehicleCtaHint')}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/60 shadow-xl shadow-cyan-500/5">
      <button
        type="button"
        onClick={closeForm}
        className="flex w-full items-center justify-between gap-3 border-b border-cyan-500/30 bg-cyan-500/15 px-5 py-4 text-start transition hover:bg-cyan-500/20"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500 p-2.5 text-slate-950">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black text-white">{t('productivity.addVehicleFormTitle')}</p>
            <p className="text-sm text-cyan-100/80">{t('productivity.addVehicleCtaHint')}</p>
          </div>
        </div>
        <ChevronUp className="h-5 w-5 shrink-0 text-cyan-200" />
      </button>

      <div className="space-y-4 p-5 sm:p-6">
        <Field label={t('vehicles.cols.vin')} required>
          <input
            className={inputCls()}
            dir="ltr"
            value={vin}
            onChange={e => setVin(e.target.value)}
            placeholder="VIN"
            autoFocus
          />
        </Field>

        <VehicleModelFamilyPicker
          models={models}
          familyId={familyId}
          variantId={modelId}
          loading={listsLoading}
          onFamilyChange={id => setFamilyId(id)}
          onVariantChange={id => {
            setModelId(id)
            const fam = resolveFamilyIdForVariant(models, id)
            if (fam) setFamilyId(fam)
          }}
        />

        <Field label={t('mp.f.color')}>
          {listsLoading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : colors.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
              {t('mp.noColorsInSettings')}
            </p>
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

        <Field label={t('org.f.orgUnit')} required>
          <FactoryOrgUnitPicker units={orgUnits} path={orgPath} onChange={setOrgPath} />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={closeForm}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="rounded-xl bg-cyan-500 px-8 py-3 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {submitting ? t('common.saving') : t('productivity.saveEntry')}
          </button>
        </div>
      </div>
    </div>
  )
}
