import type { VehicleModel } from '../Types/settings'
import { MODEL_LINES, type ModelLine, modelBelongsToLine } from './modelLines'

export type ClassificationPreset = { value: string; label: string }

/** توليد قيم/عناوين التصنيف العشرة لخط بثلاث متغيرات (مثل T4C, T4L, T4T) */
export function buildThreeVariantPresets(v1: string, v2: string, v3: string): ClassificationPreset[] {
  const a = v1.toUpperCase()
  const b = v2.toUpperCase()
  const c = v3.toUpperCase()
  const slug = (parts: string[], suffix = '') =>
    `${parts.map(p => p.toLowerCase()).join('-')}${suffix ? `-${suffix}` : ''}`

  return [
    { value: 'common', label: 'Common' },
    { value: slug([a], 'only'), label: `${a} only` },
    { value: slug([b], 'only'), label: `${b} only` },
    { value: slug([c], 'only'), label: `${c} only` },
    { value: slug([a, b], 'only'), label: `(${a}-${b}) only` },
    { value: slug([a, c], 'only'), label: `(${a}-${c}) only` },
    { value: slug([b, c], 'only'), label: `(${b}-${c}) only` },
    { value: slug([a, b, c]), label: `(${a}-${b}-${c})` },
    { value: `${a.toLowerCase()}__${b.toLowerCase()}-${c.toLowerCase()}`, label: `(${a})(${b}-${c})` },
    { value: `${a.toLowerCase()}-${c.toLowerCase()}__${b.toLowerCase()}`, label: `(${a}-${c})(${b})` }
  ]
}

const T4_PRESETS = buildThreeVariantPresets('T4C', 'T4L', 'T4T')
const T8_PRESETS = buildThreeVariantPresets('T8C', 'T8L', 'T8')
const T7_PRESETS = buildThreeVariantPresets('T7', 'T7B', 'T7H')

const LINE_PRESETS: Partial<Record<ModelLine, ClassificationPreset[]>> = {
  T4: T4_PRESETS,
  T8: T8_PRESETS,
  T7: T7_PRESETS,
  GD: [
    { value: 'common', label: 'Common' },
    { value: 'gd-only', label: 'GD only' }
  ],
  Foton: [
    { value: 'common', label: 'Common' },
    { value: 'foton-only', label: 'Foton only' }
  ]
}

export function getPresetsForLine(line: ModelLine): ClassificationPreset[] {
  return LINE_PRESETS[line] ?? [{ value: 'common', label: 'Common' }]
}

/** متغيرات الموديل الفرعية من جدول vehicle_models (T4C, T4L, …) */
export function getVariantsForLine(models: VehicleModel[], line: ModelLine): string[] {
  const base = line.toUpperCase()
  const names = models
    .filter(m => modelBelongsToLine(m.name, line))
    .map(m => m.name.trim().toUpperCase())
    .filter(n => n !== base && n.length > 0)
  return [...new Set(names)].sort()
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/–/g, '-')
}

/** مطابقة نص الاستيراد أو القيمة المخزنة بأقرب preset */
export function normalizeClassification(raw: string, line?: ModelLine): string {
  const key = normalizeKey(raw)
  if (!key || key === 'common') return 'common'

  const presets = line ? getPresetsForLine(line) : [...T4_PRESETS, ...T8_PRESETS, ...T7_PRESETS]
  const byValue = presets.find(p => p.value === key)
  if (byValue) return byValue.value

  const labelKey = key.replace(/\s+only$/i, ' only')
  const byLabel = presets.find(p => normalizeKey(p.label) === labelKey || normalizeKey(p.label) === key)
  if (byLabel) return byLabel.value

  // أنماط شائعة من ملف الدراسة الزمنية
  if (line === 'T4' || /t4/.test(key)) {
    const t4 = matchT4Legacy(key)
    if (t4) return t4
  }

  return key.replace(/\s+/g, '-').replace(/[()]/g, '')
}

function matchT4Legacy(key: string): string | null {
  const map: Record<string, string> = {
    't4c only': 't4c-only',
    't4l only': 't4l-only',
    't4t only': 't4t-only',
    't4c-t4l': 't4c-t4l-only',
    't4c-t4l only': 't4c-t4l-only',
    '(t4c-t4l) only': 't4c-t4l-only',
    't4c-t4t': 't4c-t4t-only',
    '(t4c-t4t) only': 't4c-t4t-only',
    't4l-t4t': 't4l-t4t-only',
    '(t4l-t4t) only': 't4l-t4t-only',
    't4c-t4l-t4t': 't4c-t4l-t4t',
    '(t4c-t4l-t4t)': 't4c-t4l-t4t'
  }
  return map[key] ?? null
}

export function formatOperationClassification(raw: string, line?: ModelLine): string {
  const value = line ? normalizeClassification(raw, line) : normalizeKey(raw)
  const presets = line ? getPresetsForLine(line) : T4_PRESETS
  const preset = presets.find(p => p.value === value)
  if (preset) return preset.label

  if (!value || value === 'common') return 'Common'

  if (value.includes('__')) {
    return value
      .split('__')
      .map(part => {
        const tokens = part.split('-').map(t => t.toUpperCase())
        return `(${tokens.join('-')})`
      })
      .join('')
  }

  if (value.endsWith('-only')) {
    const body = value.replace(/-only$/, '')
    const tokens = body.split('-').map(t => t.toUpperCase())
    return tokens.length === 1 ? `${tokens[0]} only` : `(${tokens.join('-')}) only`
  }

  const tokens = value.split('-').map(t => t.toUpperCase())
  return tokens.length >= 2 ? `(${tokens.join('-')})` : value
}

type ParsedClass = 'all' | string[][]

/** تحليل التصنيف إلى مجموعات متغيرات */
export function parseClassificationGroups(raw: string, variantCodes: string[]): ParsedClass {
  const value = normalizeKey(raw)
  if (!value || value === 'common') return 'all'

  const upperVariants = variantCodes.map(v => v.toUpperCase())

  if (value.includes('__')) {
    return value.split('__').map(part => {
      return part
        .split('-')
        .map(t => t.toUpperCase())
        .filter(t => upperVariants.includes(t))
    }).filter(g => g.length > 0)
  }

  if (value.endsWith('-only')) {
    const body = value.slice(0, -5)
    const tokens = body.split('-').map(t => t.toUpperCase()).filter(t => upperVariants.includes(t))
    return tokens.length ? [tokens] : []
  }

  const tokens = value.split('-').map(t => t.toUpperCase()).filter(t => upperVariants.includes(t))
  if (tokens.length) return [tokens]

  const fromLabel = [...raw.toUpperCase().matchAll(/\(([^)]+)\)/g)]
  if (fromLabel.length) {
    return fromLabel.map(m =>
      m[1].split(/[-–]/).map(t => t.trim().toUpperCase()).filter(t => upperVariants.includes(t))
    ).filter(g => g.length > 0)
  }

  const single = raw.match(/^([A-Za-z0-9]+)\s+only$/i)
  if (single && upperVariants.includes(single[1].toUpperCase())) return [[single[1].toUpperCase()]]

  return []
}

export function classificationAppliesToVariant(
  classification: string,
  variant: string,
  variantCodes: string[]
): boolean {
  const parsed = parseClassificationGroups(classification, variantCodes)
  if (parsed === 'all') return true
  const v = variant.toUpperCase()
  return parsed.some(group => group.includes(v))
}

export function classificationBelongsToLine(classification: string, line: ModelLine): boolean {
  const key = normalizeKey(classification)
  if (key === 'common') return true
  const L = line.toLowerCase()
  if (L === 'foton') return key.includes('foton')
  if (L === 'gd') return key.startsWith('gd')
  return key.startsWith(L) || key.includes(L) || /^t[478]/.test(key)
}

export function operationMatchesLineFilter(
  operationType: string,
  line: ModelLine,
  variantFilter: string,
  variantCodes: string[]
): boolean {
  if (!classificationBelongsToLine(operationType, line)) return false
  if (!variantFilter) return true
  return classificationAppliesToVariant(operationType, variantFilter, variantCodes)
}
