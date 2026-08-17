import type { MpLookupOption } from '../Types/mpLookup'
import { useLang } from '../i18n/LanguageContext'
import { mpLookupLabel } from '../Utils/mpLookupLabel'

type Props = {
  options: MpLookupOption[]
  value: string
  onChange: (code: string) => void
  className?: string
  disabled?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}

export function MpLookupSelect({
  options,
  value,
  onChange,
  className = 'input-dark',
  disabled,
  allowEmpty,
  emptyLabel
}: Props) {
  const { lang } = useLang()
  return (
    <select
      className={className}
      value={value}
      disabled={disabled || (!allowEmpty && options.length === 0)}
      onChange={e => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">{emptyLabel ?? '—'}</option>}
      {options.map(o => (
        <option key={o.code} value={o.code}>
          {mpLookupLabel(options, o.code, lang)}
        </option>
      ))}
    </select>
  )
}
