import type { ReactNode } from 'react'
import { MODEL_LINES, MODEL_LINE_STYLES, type ModelLine } from '../../../Utils/modelLines'
import { getPresetsForLine } from '../../../Utils/lineClassifications'

export function ModelTab({
  active,
  label,
  style,
  onClick
}: {
  active: boolean
  label: string
  style: { tabActive: string; tabIdle: string }
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-black transition ${active ? style.tabActive : style.tabIdle}`}
    >
      {label}
    </button>
  )
}

export function VariantFilter({
  line,
  variants,
  activeVariant,
  onSelect,
  t
}: {
  line: ModelLine
  variants: string[]
  activeVariant: string
  onSelect: (v: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const style = MODEL_LINE_STYLES[line]
  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('operations.variantFilter', { line })}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-black ${!activeVariant ? style.tabActive : style.tabIdle}`}
        >
          {t('operations.allVariants', { line })}
        </button>
        {variants.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-black ${activeVariant === v ? style.tabActive : style.tabIdle}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ClassificationLegend({
  line,
  t
}: {
  line: ModelLine
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const presets = getPresetsForLine(line)
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">{t('operations.classLegend', { line })}</p>
      <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map(p => (
          <li key={p.value} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            {p.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StationOperationsLineFilter({
  activeLine,
  lineVariants,
  activeVariant,
  onSelectLine,
  onSelectVariant,
  t
}: {
  activeLine: ModelLine
  lineVariants: string[]
  activeVariant: string
  onSelectLine: (line: ModelLine) => void
  onSelectVariant: (v: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const lines = MODEL_LINES

  return (
    <div className="card-industrial p-4">
      <p className="mb-2 text-xs font-bold uppercase text-slate-500">{t('operations.modelPages')}</p>
      <div className="flex flex-wrap gap-2">
        {lines.map(line => (
          <ModelTab
            key={line}
            active={activeLine === line}
            label={line}
            style={MODEL_LINE_STYLES[line]}
            onClick={() => onSelectLine(line)}
          />
        ))}
      </div>
      {lineVariants.length > 0 && (
        <VariantFilter line={activeLine} variants={lineVariants} activeVariant={activeVariant} onSelect={onSelectVariant} t={t} />
      )}
      {lineVariants.length >= 3 && <ClassificationLegend line={activeLine} t={t} />}
    </div>
  )
}

export function HeaderCell({
  label,
  value,
  accent,
  accentTone = 'cyan',
  icon,
  dir
}: {
  label: string
  value: string
  accent?: boolean
  accentTone?: 'cyan' | 'orange'
  icon?: ReactNode
  dir?: 'ltr' | 'rtl'
}) {
  const accentCls = accentTone === 'orange' ? 'text-orange-300' : 'text-cyan-300'
  return (
    <div className="text-center">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 flex items-center justify-center gap-1.5 text-base font-black ${accent ? accentCls : 'text-white'} ${dir === 'ltr' ? 'font-mono' : ''}`}
        dir={dir}
      >
        {icon}
        {value}
      </p>
    </div>
  )
}
