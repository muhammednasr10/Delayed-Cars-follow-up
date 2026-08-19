import { useLang } from '../../i18n/LanguageContext'
import { Field } from './Field'
import type { VehicleForm } from './types'

export function VinInputSection({
  vehicle,
  duplicateVinIdx,
  hasConfirmedExisting,
  updateVehicleVin,
  checkVinDuplicate
}: {
  vehicle: VehicleForm
  duplicateVinIdx: Set<number>
  hasConfirmedExisting: boolean
  updateVehicleVin: (index: number, value: string) => void
  checkVinDuplicate: (index: number) => void
}) {
  const { t } = useLang()

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-500">
        {vehicle.vehicleCount === 1 ? t('mp.singleVinTitle') : t('mp.vinListTitle')}
      </p>
      <p className="text-[10px] text-slate-500">{t('mp.vinHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {vehicle.vins.map((vin, vi) => {
          const isDuplicate = duplicateVinIdx.has(vi)
          return (
            <Field
              key={vi}
              label={vehicle.vehicleCount === 1 ? t('mp.f.vin') : t('mp.f.vinN', { n: vi + 1 })}
              required
            >
              <input
                className={`input-dark font-mono ${
                  isDuplicate ? 'border-red-500 text-red-300 focus:border-red-400 focus:ring-red-400/20' : ''
                }`}
                dir="ltr"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                minLength={4}
                required
                value={vin}
                aria-invalid={isDuplicate || undefined}
                title={isDuplicate ? t('mp.errDuplicateVin') : undefined}
                onChange={e => updateVehicleVin(vi, e.target.value)}
                onBlur={() => void checkVinDuplicate(vi)}
                placeholder="0000"
              />
            </Field>
          )
        })}
      </div>
      {hasConfirmedExisting && (
        <p className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          {t('mp.addingToExistingHint')}
        </p>
      )}
    </div>
  )
}
