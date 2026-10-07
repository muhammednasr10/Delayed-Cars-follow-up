import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { sanitizeChassisDigits } from '../../Utils/vinListConflict'
import { MAX_MISSION_VEHICLES, resizeChassis } from '../../Utils/missionForm'

type Props = {
  vehicleCount: number | null
  chassisNumbers: string[]
  countLabel?: string
  onChange: (vehicleCount: number | null, chassisNumbers: string[]) => void
}

export function MissionChassisFields({ vehicleCount, chassisNumbers, countLabel, onChange }: Props) {
  const { t } = useLang()
  const count = vehicleCount ?? 0

  return (
    <>
      <Field label={countLabel ?? t('missions.cols.vehicleCount')}>
        <input
          type="number"
          min={0}
          max={MAX_MISSION_VEHICLES}
          className={inputCls()}
          value={vehicleCount ?? ''}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null, [])
              return
            }
            const parsed = Number.parseInt(raw, 10)
            if (!Number.isFinite(parsed) || parsed < 0) return
            const next = Math.min(parsed, MAX_MISSION_VEHICLES)
            onChange(next, resizeChassis(chassisNumbers, next))
          }}
        />
      </Field>
      {count > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {chassisNumbers.map((vin, index) => (
            <Field key={index} label={t('missions.chassisLabel', { n: index + 1 })} required>
              <input
                className={`${inputCls()} font-mono`}
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                value={vin}
                placeholder="0000"
                onChange={e => {
                  const next = sanitizeChassisDigits(e.target.value)
                  onChange(
                    vehicleCount,
                    chassisNumbers.map((item, i) => (i === index ? next : item))
                  )
                }}
              />
            </Field>
          ))}
        </div>
      )}
    </>
  )
}
