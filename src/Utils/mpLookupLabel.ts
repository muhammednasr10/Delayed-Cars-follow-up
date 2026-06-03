import { departmentLabel, reasonLabel } from '../Types/enums'
import type { MpLookupOption } from '../Types/mpLookup'

export function mpLookupLabel(options: MpLookupOption[], code: string, lang: string): string {
  const hit = options.find(o => o.code === code)
  if (hit) return lang === 'ar' ? hit.labelAr : hit.labelEn
  const reason = reasonLabel[code as keyof typeof reasonLabel]
  if (reason) return reason
  const dept = departmentLabel[code as keyof typeof departmentLabel]
  if (dept) return dept
  return code
}

export function defaultReasonCode(options: MpLookupOption[]): string {
  return options[0]?.code ?? 'stock_shortage'
}

export function defaultDepartmentCode(options: MpLookupOption[]): string {
  return options[0]?.code ?? 'warehouse'
}
