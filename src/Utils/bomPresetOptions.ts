import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE, HARDWARE_PART_KIND, PLASTICS_PART_KIND } from './bomDefaults'
import { partKindLabel, supplySourceLabel } from './bomDisplayFormat'

export type BomPresetOption = { value: string; label: string }

export function partKindPresetOptions(t: (k: string) => string): BomPresetOption[] {
  return [
    { value: DEFAULT_PART_KIND, label: t('bom.partKindPart') },
    { value: HARDWARE_PART_KIND, label: t('bom.partKindHardware') },
    { value: PLASTICS_PART_KIND, label: t('bom.partKindPlastics') }
  ]
}

export function supplySourcePresetOptions(t: (k: string) => string): BomPresetOption[] {
  return [
    { value: 'CKD', label: t('bom.supplyCkd') },
    { value: 'Local', label: t('bom.supplyLocal') }
  ]
}

export function labelForPartKindValue(value: string, t: (k: string) => string): string {
  const preset = partKindPresetOptions(t).find(p => p.value === value)
  if (preset) return preset.label
  return partKindLabel(value, t)
}

export function labelForSupplySourceValue(value: string, t: (k: string) => string): string {
  const preset = supplySourcePresetOptions(t).find(p => p.value === value)
  if (preset) return preset.label
  return supplySourceLabel(value, t)
}

export function defaultSupplySourceValue(raw?: string | null): string {
  const s = String(raw ?? '').trim()
  return s || DEFAULT_SUPPLY_SOURCE
}
